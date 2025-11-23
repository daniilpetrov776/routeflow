/**
 * @module lib/balloon
 * 
 * Библиотека для работы с кастомным balloon вместо стандартного Yandex Maps
 * 
 * ## Flow использования:
 * 
 * ### 1. Инициализация (balloon-hider.ts)
 * Инициализация глобального обработчика для скрытия стандартных balloon.
 * Вызывается **один раз** при загрузке приложения.
 * 
 * ```typescript
 * import { initGlobalBalloonHider } from '@/lib/balloon';
 * 
 * // В useYandexMaps или App.tsx
 * useEffect(() => {
 *   initGlobalBalloonHider();
 * }, []);
 * ```
 * 
 * ### 2. Скрытие стандартного balloon (balloon-hider.ts)
 * Скрытие стандартного balloon при клике на маршрут.
 * 
 * ```typescript
 * import { hideStandardBalloon } from '@/lib/balloon';
 * 
 * route.events.add('click', () => {
 *   hideStandardBalloon(route);
 * });
 * ```
 * 
 * ### 3. Преобразование координат (balloon-coordinates.ts)
 * Преобразование координат карты в пиксели экрана для позиционирования balloon.
 * 
 * ```typescript
 * import { getMousePositionFromEvent, getClickCoordinates } from '@/lib/balloon';
 * 
 * const clickCoords = getClickCoordinates(event);
 * const mousePosition = getMousePositionFromEvent(event, map, clickCoords);
 * ```
 * 
 * ### 4. Работа с DOM (balloon-dom.ts)
 * Получение DOM элемента контейнера карты (внутренний API).
 * 
 * ```typescript
 * import { getMapContainerElement } from '@/lib/balloon';
 * 
 * const mapElement = getMapContainerElement(map);
 * ```
 * 
 * @see {@link ./types.ts} для типов библиотеки
 */

// Инициализация
export {
  initGlobalBalloonHider,
} from './balloon-hider';

// Скрытие стандартного balloon
export {
  hideStandardBalloon,
} from './balloon-hider';

// Работа с DOM (внутренний API, но может быть полезен)
export {
  getMapContainerElement,
} from './balloon-dom';

// Преобразование координат
export {
  coordinatesToPixels,
  getMousePositionFromEvent,
  getClickCoordinates,
} from './balloon-coordinates';

// Типы
export type {
  PixelPosition,
  CoordinatesToPixelsParams,
  MousePositionFromEventParams,
} from './types';

