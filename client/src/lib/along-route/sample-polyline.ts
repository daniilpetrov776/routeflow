import type { Coordinates } from "@/types/yandex-maps";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Равномерно по длине семплирует ломаную маршрута ([lat, lon]) в не более чем
 * maxPoints точек и возвращает их в формате [lon, lat] для запроса к серверу.
 */
export function samplePolylineForRequest(
  polyline: Coordinates[],
  maxPoints = 8
): Array<[number, number]> {
  const cleaned = polyline.filter(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1])
  );

  if (cleaned.length === 0) {
    return [];
  }

  if (cleaned.length <= maxPoints) {
    return cleaned.map(([lat, lon]) => [lon, lat]);
  }

  // Кумулятивная длина по сегментам
  const cumulative: number[] = [0];
  for (let i = 1; i < cleaned.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineMeters(cleaned[i - 1], cleaned[i]));
  }
  const total = cumulative[cumulative.length - 1];

  if (total === 0) {
    return [[cleaned[0][1], cleaned[0][0]]];
  }

  const result: Array<[number, number]> = [];
  let searchIndex = 0;

  for (let s = 0; s < maxPoints; s++) {
    const target = (total * s) / (maxPoints - 1);
    while (searchIndex < cumulative.length - 1 && cumulative[searchIndex] < target) {
      searchIndex++;
    }
    const [lat, lon] = cleaned[Math.min(searchIndex, cleaned.length - 1)];
    result.push([lon, lat]);
  }

  return result;
}
