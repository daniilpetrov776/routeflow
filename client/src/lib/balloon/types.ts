/**
 * Типы для библиотеки balloon
 */

import type { YandexMap, Coordinates } from "@/types/yandex-maps";

/**
 * Позиция в пикселях на экране
 */
export interface PixelPosition {
  x: number;
  y: number;
}

/**
 * Параметры для преобразования координат в пиксели
 */
export interface CoordinatesToPixelsParams {
  map: YandexMap;
  coordinates: Coordinates;
}

/**
 * Параметры для получения позиции мыши из события
 */
export interface MousePositionFromEventParams {
  event: any;
  map: YandexMap;
  fallbackCoords: Coordinates;
}

