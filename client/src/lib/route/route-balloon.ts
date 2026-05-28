import type { AddressPoint } from "@/store/route-slice";
import type { YandexMultiRoute, YandexEvent, YandexMap } from "@/types/yandex-maps";
import type { Coordinates } from "@/types/yandex-maps";
import { openRouteBalloon } from "@/store/route-slice";
import type { AppDispatch } from "@/store";
import { hideStandardBalloon, getClickCoordinates, getMousePositionFromEvent } from "../balloon";
import { extractRouteProperties } from "./route-properties";

/**
 * Получает координаты для отображения balloon
 */
const getBalloonCoordinates = (
  event: YandexEvent | undefined,
  route: YandexMultiRoute,
  destination: AddressPoint
): Coordinates => {
  // Пробуем получить координаты клика из события
  const clickCoords = getClickCoordinates(event);
  if (clickCoords) {
    return clickCoords;
  }

  // Если координаты клика не найдены, используем координаты середины маршрута
  const activeRoute = route.getActiveRoute();
  if (activeRoute) {
    const path = activeRoute.getPath();
    if (path && path.length > 0) {
      const midIndex = Math.floor(path.length / 2);
      return path[midIndex] as Coordinates;
    }
  }

  // Fallback: используем координаты пункта назначения
  return destination.coordinates;
};

/**
 * Добавляет обработчик клика для маршрута
 */
export const addRouteClickHandler = (
  route: YandexMultiRoute,
  routeIndex: number,
  destination: AddressPoint,
  map: YandexMap,
  dispatch: AppDispatch
): void => {
  console.log('Adding click handler for route', routeIndex);
  
  // Перехватываем событие клика
  route.events.add('click', (event?: YandexEvent) => {
    console.log('Route clicked!', routeIndex);
    
    // Предотвращаем всплытие события
    try {
      const originalEvent = event?.get('originalEvent') as MouseEvent | undefined;
      if (originalEvent) {
        originalEvent.stopPropagation();
        originalEvent.preventDefault();
      }
    } catch (e) {
      // Игнорируем ошибку
    }
    
    const activeRoute = route.getActiveRoute();
    if (!activeRoute) {
      console.warn('No active route found');
      return;
    }

    // Скрываем стандартный balloon сразу
    hideStandardBalloon(route);

    // Извлекаем данные маршрута
    const { duration, distance } = extractRouteProperties(activeRoute);

    // Получаем координаты для balloon
    const balloonCoords = getBalloonCoordinates(event, route, destination);

    // Получаем позицию мыши
    const mousePosition = getMousePositionFromEvent(event, map, balloonCoords);
    
    if (mousePosition && 
        typeof mousePosition.x === 'number' && 
        typeof mousePosition.y === 'number' && 
        !isNaN(mousePosition.x) && 
        !isNaN(mousePosition.y)) {
      console.log('Opening custom balloon at position:', mousePosition);
      
      // Используем setTimeout, чтобы убедиться, что событие клика полностью обработано
      setTimeout(() => {
        dispatch(openRouteBalloon({
          data: {
            routeIndex,
            destination,
            duration,
            distance,
          },
          position: mousePosition,
        }));
      }, 0);
    } else {
      console.error('Failed to determine valid position for balloon');
    }
  });

  // Перехватываем открытие стандартного balloon и скрываем его
  route.events.add('balloonopen', () => {
    console.log('Standard balloon opened, hiding it');
    hideStandardBalloon(route);
  });
};
