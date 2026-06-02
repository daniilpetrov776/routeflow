import type { Coordinates } from "@/types/yandex-maps";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Проецирует координаты [lat, lon] в локальную плоскость (метры) вокруг опорной широты.
 * Достаточно точно для расстояний в пределах города.
 */
function toLocalMeters(
  point: Coordinates,
  originLatRad: number
): { x: number; y: number } {
  const [lat, lon] = point;
  const x = toRadians(lon) * Math.cos(originLatRad) * EARTH_RADIUS_M;
  const y = toRadians(lat) * EARTH_RADIUS_M;
  return { x, y };
}

function distancePointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): { distance: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { distance: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return { distance: Math.hypot(p.x - projX, p.y - projY), t };
}

export interface RouteProjection {
  /** Минимальное отклонение точки от линии маршрута, м. */
  deviationMeters: number;
  /** Длина маршрута от старта до проекции точки, м. */
  alongDistanceMeters: number;
  /** Полная длина маршрута, м. */
  totalRouteMeters: number;
}

/**
 * Проецирует точку на ломаную маршрута: возвращает отклонение, длину от старта
 * до проекции и полную длину маршрута. Все координаты в формате [lat, lon].
 */
export function projectPointOntoRoute(
  point: Coordinates,
  polyline: Coordinates[]
): RouteProjection {
  if (polyline.length === 0) {
    return { deviationMeters: Number.POSITIVE_INFINITY, alongDistanceMeters: 0, totalRouteMeters: 0 };
  }

  const originLatRad = toRadians(point[0]);
  const p = toLocalMeters(point, originLatRad);

  if (polyline.length === 1) {
    const a = toLocalMeters(polyline[0], originLatRad);
    return {
      deviationMeters: Math.hypot(p.x - a.x, p.y - a.y),
      alongDistanceMeters: 0,
      totalRouteMeters: 0,
    };
  }

  let minDistance = Number.POSITIVE_INFINITY;
  let alongAtMin = 0;
  let cumulative = 0;

  for (let i = 1; i < polyline.length; i++) {
    const a = toLocalMeters(polyline[i - 1], originLatRad);
    const b = toLocalMeters(polyline[i], originLatRad);
    const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
    const { distance, t } = distancePointToSegment(p, a, b);

    if (distance < minDistance) {
      minDistance = distance;
      alongAtMin = cumulative + t * segmentLength;
    }

    cumulative += segmentLength;
  }

  return {
    deviationMeters: minDistance,
    alongDistanceMeters: alongAtMin,
    totalRouteMeters: cumulative,
  };
}

/**
 * Минимальное расстояние (в метрах) от точки до ломаной маршрута.
 * Все координаты в формате [lat, lon].
 */
export function distanceToRouteMeters(
  point: Coordinates,
  polyline: Coordinates[]
): number {
  return projectPointOntoRoute(point, polyline).deviationMeters;
}

export interface AxisProgress {
  /** Позиция вдоль оси «старт → финиш», 0 (старт) .. 1 (финиш). */
  progress: number;
  /** Прямое расстояние от старта до проекции точки на ось, м. */
  distanceFromStartMeters: number;
  /** Прямое расстояние от проекции точки до финиша, м. */
  distanceFromEndMeters: number;
}

/**
 * Проецирует точку на прямую «старт → финиш» и возвращает позицию вдоль неё.
 *
 * В отличие от {@link projectPointOntoRoute}, это устойчиво к маршрутам с
 * заездами/возвратами (zig-zag): индикатор показывает географическое
 * приближение к цели, а не накопленную длину петляющей геометрии.
 * Все координаты в формате [lat, lon].
 */
export function projectProgressOntoAxis(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates
): AxisProgress {
  const originLatRad = toRadians(start[0]);
  const p = toLocalMeters(point, originLatRad);
  const a = toLocalMeters(start, originLatRad);
  const b = toLocalMeters(end, originLatRad);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { progress: 0, distanceFromStartMeters: 0, distanceFromEndMeters: 0 };
  }

  const axisLength = Math.sqrt(lengthSquared);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return {
    progress: t,
    distanceFromStartMeters: t * axisLength,
    distanceFromEndMeters: (1 - t) * axisLength,
  };
}
