import type { AddressPoint } from "@/store/route-slice";

/**
 * Проверяет, что координаты валидны
 */
export const isValidCoordinates = (coordinates: [number, number] | undefined): boolean => {
  if (!coordinates || coordinates.length !== 2) {
    return false;
  }

  const [lat, lon] = coordinates;
  
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
};

/**
 * Проверяет, что адресная точка валидна
 */
export const isValidAddressPoint = (point: AddressPoint): boolean => {
  return (
    point.address?.trim() !== '' &&
    isValidCoordinates(point.coordinates)
  );
};

/**
 * Фильтрует валидные пункты назначения
 */
export const filterValidDestinations = (destinations: AddressPoint[]): AddressPoint[] => {
  return destinations.filter(isValidAddressPoint);
};

/**
 * Проверяет, что начальная точка валидна
 */
export const validateStartingPoint = (startingPoint: AddressPoint | null): string | null => {
  if (!startingPoint) {
    return "Начальная точка не задана";
  }

  if (!isValidCoordinates(startingPoint.coordinates)) {
    return "Некорректные координаты начальной точки";
  }

  return null;
};

/**
 * Проверяет, что пункт назначения валиден
 */
export const validateDestination = (destination: AddressPoint, index: number): string | null => {
  if (!isValidCoordinates(destination.coordinates)) {
    return `Некорректные координаты пункта назначения #${index + 1}`;
  }

  return null;
};

/**
 * Проверяет валидность координат для маршрута
 */
export const validateRouteCoordinates = (
  startingPoint: AddressPoint,
  destination: AddressPoint,
  index: number
): string | null => {
  const [startLat, startLon] = startingPoint.coordinates;
  const [destLat, destLon] = destination.coordinates;

  if (
    !Number.isFinite(startLat) || !Number.isFinite(startLon) ||
    !Number.isFinite(destLat) || !Number.isFinite(destLon) ||
    startLat < -90 || startLat > 90 ||
    startLon < -180 || startLon > 180 ||
    destLat < -90 || destLat > 90 ||
    destLon < -180 || destLon > 180
  ) {
    return `Некорректные координаты для маршрута #${index + 1}. Проверьте адреса.`;
  }

  return null;
};

