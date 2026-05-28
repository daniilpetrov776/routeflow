/**
 * Типы для библиотеки маршрутов
 */

import type { AddressPoint, TransportMode, RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute, YandexMap } from "@/types/yandex-maps";

/**
 * Результат валидации
 */
export type ValidationResult = string | null;

/**
 * Параметры для создания обработчика успешного расчета
 */
export interface RouteSuccessHandlerParams {
  route: YandexMultiRoute;
  routeIndex: number;
  startingPoint: AddressPoint;
  destination: AddressPoint;
  routeResults: Array<RouteOption | null>;
  completedRef: { current: number };
  totalDestinations: number;
  routesRef: React.RefObject<YandexMultiRoute[]>;
  yandexMapRef: React.RefObject<YandexMap | null>;
  dispatch: any;
}

/**
 * Параметры для создания обработчика ошибки
 */
export interface RouteErrorHandlerParams {
  routeIndex: number;
  startingPoint: AddressPoint;
  destination: AddressPoint;
  routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit";
  transportMode: TransportMode;
  routeResults: Array<RouteOption | null>;
  completedRef: { current: number };
  totalDestinations: number;
  dispatch: any;
}

/**
 * Извлеченные свойства маршрута
 */
export interface ExtractedRouteProperties {
  duration: number;
  distance: number;
  isBlocked: boolean;
}

/**
 * Параметры для добавления обработчика клика на маршрут
 */
export interface RouteClickHandlerParams {
  route: YandexMultiRoute;
  routeIndex: number;
  destination: AddressPoint;
  map: YandexMap;
  dispatch: any;
}

