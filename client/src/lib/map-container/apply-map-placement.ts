import { reverseGeocode } from "@/lib/geocoding";
import { COORDINATE_MATCH_EPSILON } from "@/lib/map-container/helpers";
import type { AddressPoint } from "@/store/route-slice";
import type { Coordinates } from "@/types/yandex-maps";

export type MapPlacementToast = (options: {
  variant?: "destructive";
  title: string;
  description?: string;
}) => void;

export type ApplyMapPlacementActions = {
  setStartingPoint: (point: AddressPoint) => void;
  addDestination: (point: AddressPoint) => void;
};

function isSamePoint(a: AddressPoint, b: AddressPoint): boolean {
  return (
    Math.abs(a.coordinates[0] - b.coordinates[0]) < COORDINATE_MATCH_EPSILON &&
    Math.abs(a.coordinates[1] - b.coordinates[1]) < COORDINATE_MATCH_EPSILON
  );
}

export function isPointInRoute(
  point: AddressPoint,
  startingPoint: AddressPoint | null,
  destinations: AddressPoint[]
): boolean {
  if (startingPoint && isSamePoint(point, startingPoint)) {
    return true;
  }

  return destinations.some((destination) => isSamePoint(point, destination));
}

async function geocodeMapPoint(
  coords: Coordinates,
  toast: MapPlacementToast
): Promise<AddressPoint | null> {
  const [lat, lon] = coords;
  const geocoded = await reverseGeocode(lat, lon);

  if (!geocoded) {
    toast({
      variant: "destructive",
      title: "Не удалось определить адрес",
      description: "Попробуйте выбрать другое место на карте.",
    });
    return null;
  }

  // Маркер ставим ровно в точку клика; геокодер возвращает координаты
  // ближайшего адреса/перекрёстка и может смещать точку на сотни метров.
  return {
    address: geocoded.address,
    coordinates: coords,
  };
}

export async function applyStartingPointAtCoords(
  coords: Coordinates,
  actions: ApplyMapPlacementActions,
  toast: MapPlacementToast
): Promise<boolean> {
  const point = await geocodeMapPoint(coords, toast);
  if (!point) {
    return false;
  }

  actions.setStartingPoint(point);
  return true;
}

export async function applyDestinationAtCoords(
  coords: Coordinates,
  context: {
    startingPoint: AddressPoint | null;
    destinations: AddressPoint[];
  },
  actions: ApplyMapPlacementActions,
  toast: MapPlacementToast
): Promise<boolean> {
  const point = await geocodeMapPoint(coords, toast);
  if (!point) {
    return false;
  }

  if (isPointInRoute(point, context.startingPoint, context.destinations)) {
    toast({
      title: "Уже в маршруте",
      description: "Эта точка уже указана как начальная или пункт назначения.",
    });
    return false;
  }

  actions.addDestination(point);
  return true;
}
