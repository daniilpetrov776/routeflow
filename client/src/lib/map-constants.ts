import type { Coordinates } from "@/types/yandex-maps";
import { MAX_DESTINATIONS } from "@shared/route-limits";

/**
 * Константы для работы с картой и маршрутами
 */

/**
 * Координаты центра Москвы [широта, долгота]
 * Используется как начальная точка по умолчанию
 */
export const MOSCOW_CENTER: Coordinates = [55.7558, 37.6176];

/**
 * Координаты для начального отображения карты [широта, долгота]
 * Немного отличается от MOSCOW_CENTER для лучшего отображения
 */
export const DEFAULT_MAP_CENTER: Coordinates = [55.76, 37.64];

/**
 * Начальный уровень масштабирования карты
 */
export const DEFAULT_MAP_ZOOM = 10;

/**
 * Уровень масштабирования при центрировании на начальной точке
 */
export const STARTING_POINT_ZOOM = 12;

/**
 * Длительность анимации перемещения карты (в миллисекундах)
 */
export const MAP_ANIMATION_DURATION = 300;

/**
 * Задержка перед подгонкой границ карты под маршруты (в миллисекундах)
 * Нужна для того, чтобы маршруты успели отрисоваться
 */
export const MAP_BOUNDS_ADJUSTMENT_DELAY = 1000;

/**
 * Цвета для маршрутов
 */
export const ROUTE_COLORS = {
  /** Уникальный цвет для каждого маршрута (до MAX_DESTINATIONS) */
  PALETTE: [
    "#16a34a",
    "#2563eb",
    "#f97316",
    "#9333ea",
    "#0891b2",
    "#db2777",
    "#ca8a04",
    "#4f46e5",
    "#0d9488",
    "#e11d48",
  ],
  /** Зеленый цвет для быстрого/активного маршрута */
  FASTEST: "#16a34a",
  /** Синий цвет для обычных маршрутов */
  NORMAL: "#2563eb",
  /** Красный цвет для финальной точки маршрута */
  FINISH: "#dc3545",
} as const;

export const getRouteColor = (index: number): string => {
  const palette = ROUTE_COLORS.PALETTE;
  const clampedIndex = Math.max(0, Math.min(index, MAX_DESTINATIONS - 1, palette.length - 1));
  return palette[clampedIndex];
};

/**
 * Настройки отображения маршрутов
 */
export const ROUTE_STYLES = {
  /** Ширина линии быстрого маршрута (в пикселях) */
  FASTEST_STROKE_WIDTH: 6,
  /** Ширина линии обычного маршрута (в пикселях) */
  NORMAL_STROKE_WIDTH: 4,
  /** Базовая прозрачность линий Yandex MultiRoute. Основной маршрут дублируется отдельной линией. */
  BASE_STROKE_OPACITY: 0.70,
  /** Прозрачность дублирующей линии выбранного маршрута. */
  ACTIVE_OVERLAY_OPACITY: 0.80,
  /** Настройки для тёмной темы карты — выше контраст активной альтернативы */
  DARK: {
    ACTIVE_OPACITY: 1,
    INACTIVE_OPACITY: 0.6,
    ACTIVE_WIDTH_BOOST: 2,
    OVERLAY_OPACITY: 1,
    OVERLAY_OUTLINE_COLOR: "#ffffff",
    OVERLAY_OUTLINE_WIDTH: 3,
    OVERLAY_OUTLINE_OPACITY: 0.9,
  },
  /** Непрозрачность быстрого маршрута */
  FASTEST_OPACITY: 1.0,
  /** Непрозрачность обычного маршрута */
  NORMAL_OPACITY: 0.7,
} as const;

/**
 * Задержка перед скрытием подсказок адреса (в миллисекундах)
 * Используется для предотвращения закрытия при переключении фокуса
 */
export const ADDRESS_SUGGESTIONS_HIDE_DELAY = 150;

/**
 * Отступ при подгонке границ карты под маршруты (в пикселях)
 */
export const MAP_ZOOM_MARGIN = 50;

