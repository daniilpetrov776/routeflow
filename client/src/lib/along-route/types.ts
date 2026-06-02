import type { Coordinates } from "@/types/yandex-maps";

/**
 * Организация-кандидат рядом с маршрутом.
 * Координаты в клиентском формате Yandex — [lat, lon].
 */
export interface AlongRouteCandidate {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates: Coordinates;
  uri?: string;
  /** Отклонение от линии маршрута в метрах. */
  deviationMeters: number;
  /** Длина маршрута от старта до проекции точки, м. */
  distanceFromStartMeters: number;
  /** Длина маршрута от проекции точки до конца, м. */
  distanceFromEndMeters: number;
  /** Позиция вдоль маршрута, 0 (старт) .. 1 (финиш). */
  progress: number;
}

/**
 * Результат расчёта заезда: метрики маршрута с заездом и дельта к исходному.
 */
export interface DetourResult {
  /** Длительность маршрута с заездом, сек. */
  duration: number;
  /** Расстояние маршрута с заездом, м. */
  distance: number;
  /** Прирост длительности относительно исходного маршрута, сек. */
  durationDelta: number;
  /** Прирост расстояния относительно исходного маршрута, м. */
  distanceDelta: number;
}
