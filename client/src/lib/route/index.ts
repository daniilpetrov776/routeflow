/**
 * @module lib/route
 * 
 * Библиотека для работы с маршрутами Yandex Maps
 * 
 * ## Flow использования:
 * 
 * ### 1. Валидация (route-validators.ts)
 * Проверка координат и адресов перед созданием маршрутов
 * 
 * ```typescript
 * import { validateStartingPoint, validateDestination, validateRouteCoordinates } from '@/lib/route';
 * 
 * const error = validateStartingPoint(startingPoint);
 * if (error) { /* обработка ошибки *\/ }
 * ```
 * 
 * ### 2. Создание маршрута (route-creator.ts)
 * Преобразование режима транспорта и создание MultiRoute
 * 
 * ```typescript
 * import { createMultiRoute, getYandexRoutingMode } from '@/lib/route';
 * 
 * const route = createMultiRoute(startingPoint, destination, transportMode, isFirstRoute);
 * ```
 * 
 * ### 3. Обработка событий (route-success-handler.ts, route-error-handler.ts)
 * Обработка успешного расчета и ошибок
 * 
 * ```typescript
 * import { createRouteSuccessHandler, createRouteErrorHandler } from '@/lib/route';
 * 
 * route.model.events.add("requestsuccess", createRouteSuccessHandler(...));
 * route.model.events.add("requestfail", createRouteErrorHandler(...));
 * ```
 * 
 * ### 4. Интерактивность (route-balloon.ts)
 * Обработка кликов на маршруты и открытие кастомного balloon
 * 
 * ```typescript
 * import { addRouteClickHandler } from '@/lib/route';
 * 
 * addRouteClickHandler(route, index, destination, map, dispatch);
 * ```
 * 
 * ### 5. Утилиты (route-utils.ts)
 * Форматирование длительности и расстояния для отображения
 * 
 * ```typescript
 * import { formatDuration, formatDistance } from '@/lib/route';
 * 
 * const durationText = formatDuration(3600); // "1h 0m"
 * const distanceText = formatDistance(1500); // "1.5km"
 * ```
 * 
 * @see {@link ./types.ts} для типов библиотеки
 */

// Валидация
export {
  isValidCoordinates,
  isValidAddressPoint,
  filterValidDestinations,
  validateStartingPoint,
  validateDestination,
  validateRouteCoordinates,
} from './route-validators';

// Создание маршрутов
export {
  getYandexRoutingMode,
  createRoutingParams,
  createMultiRouteOptions,
  createMultiRoute,
} from './route-creator';

// Извлечение свойств маршрута
export {
  extractDuration,
  extractDistance,
  extractBlockedStatus,
  extractRouteProperties,
} from './route-properties';

// Обработчики событий
export {
  createRouteSuccessHandler,
} from './route-success-handler';

export { toYandexRoutesArray } from './yandex-route-utils';

export {
  createRouteErrorHandler,
} from './route-error-handler';

// Обработка кликов и balloon
export {
  addRouteClickHandler,
} from './route-balloon';

// Пересчет позиции balloon
export {
  getRouteMidpoint,
  getRouteMidpointFromOption,
  recalculateBalloonPosition,
} from './route-balloon-position';

// Утилиты
export {
  formatDuration,
  formatDistance,
} from './route-utils';

// Типы
export type {
  ValidationResult,
  RouteSuccessHandlerParams,
  RouteErrorHandlerParams,
  ExtractedRouteProperties,
  RouteClickHandlerParams,
} from './types';

