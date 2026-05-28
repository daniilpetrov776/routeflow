import type {
  Coordinates,
  YandexRoute,
  YandexRoutePath,
  YandexRouteSegment,
} from "@/types/yandex-maps";

/**
 * Извлекает значение длительности из свойства маршрута
 */
export const extractDuration = (route: YandexRoute): number => {
  const durationProp = route.properties.get("duration");
  
  if (typeof durationProp === 'object' && durationProp !== null && 'value' in durationProp) {
    return durationProp.value || 0;
  }
  
  return 0;
};

/**
 * Извлекает значение расстояния из свойства маршрута
 */
export const extractDistance = (route: YandexRoute): number => {
  const distanceProp = route.properties.get("distance");
  
  if (typeof distanceProp === 'object' && distanceProp !== null && 'value' in distanceProp) {
    return distanceProp.value || 0;
  }
  
  return 0;
};

/**
 * Извлекает информацию о блокировке маршрута
 */
export const extractBlockedStatus = (route: YandexRoute): boolean => {
  const blockedProp = route.properties.get("blocked");
  return typeof blockedProp === 'boolean' ? blockedProp : false;
};

const toArrayFromYandexCollection = <T>(collection?: { each(callback: (item: T) => void): void } | T[]): T[] => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;

  const items: T[] = [];
  collection.each((item) => items.push(item));
  return items;
};

const isCoordinate = (value: unknown): value is Coordinates => {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
};

const extractCoordinatesFromUnknown = (value: unknown): Coordinates[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    if (value.every(isCoordinate)) {
      return value.map((point) => [point[0], point[1]]);
    }
    return value.flatMap(extractCoordinatesFromUnknown);
  }

  if (typeof value !== "object") return [];

  const candidate = value as {
    geometry?: unknown;
    getCoordinates?: () => unknown;
  };

  if (typeof candidate.getCoordinates === "function") {
    try {
      return extractCoordinatesFromUnknown(candidate.getCoordinates());
    } catch {
      return [];
    }
  }

  if (candidate.geometry) {
    return extractCoordinatesFromUnknown(candidate.geometry);
  }

  return [];
};

const dedupeConsecutiveCoordinates = (coordinates: Coordinates[]): Coordinates[] => {
  return coordinates.filter((point, index) => {
    const previous = coordinates[index - 1];
    return !previous || previous[0] !== point[0] || previous[1] !== point[1];
  });
};

export const extractRouteCoordinates = (route: YandexRoute): Coordinates[] | undefined => {
  try {
    const directPath = extractCoordinatesFromUnknown(route.getPath?.());
    if (directPath.length > 2) {
      return dedupeConsecutiveCoordinates(directPath);
    }
  } catch {
    // try path and segment geometry below
  }

  const routeGeometry = extractCoordinatesFromUnknown((route as { geometry?: unknown }).geometry);
  if (routeGeometry.length > 2) {
    return dedupeConsecutiveCoordinates(routeGeometry);
  }

  const paths = toArrayFromYandexCollection<YandexRoutePath>(route.getPaths?.());
  const pathCoordinates = paths.flatMap((path) => {
    const coordinates = extractCoordinatesFromUnknown(path);
    if (coordinates.length > 0) return coordinates;

    return toArrayFromYandexCollection<YandexRouteSegment>(path.getSegments()).flatMap((segment) =>
      extractCoordinatesFromUnknown(segment)
    );
  });

  if (pathCoordinates.length > 2) {
    return dedupeConsecutiveCoordinates(pathCoordinates);
  }

  return undefined;
};

const getRouteSegments = (route: YandexRoute): YandexRouteSegment[] => {
  const paths = toArrayFromYandexCollection<YandexRoutePath>(route.getPaths?.());
  return paths.flatMap((path) =>
    toArrayFromYandexCollection<YandexRouteSegment>(path.getSegments())
  );
};

export const extractTransferCount = (route: YandexRoute): number => {
  return getRouteSegments(route).filter((segment) => {
    const type = segment.properties.get("type");
    return typeof type === "string" && type.toLowerCase() === "transfer";
  }).length;
};

export const extractStairsCount = (route: YandexRoute): number => {
  return getRouteSegments(route).filter((segment) => {
    const action = segment.properties.get("action");
    if (typeof action === "string") {
      return /лестниц|stairs/i.test(action);
    }
    if (typeof action === "object" && action !== null && "text" in action) {
      return /лестниц|stairs/i.test(action.text ?? "");
    }
    return false;
  }).length;
};

/**
 * Извлекает все свойства маршрута
 */
export const extractRouteProperties = (route: YandexRoute) => {
  return {
    duration: extractDuration(route),
    distance: extractDistance(route),
    isBlocked: extractBlockedStatus(route),
    stairsCount: extractStairsCount(route),
    transferCount: extractTransferCount(route),
  };
};

