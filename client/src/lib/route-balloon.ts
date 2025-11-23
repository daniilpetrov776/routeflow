import type { AddressPoint } from "@/store/route-slice";
import type { YandexMultiRoute, YandexEvent, YandexMap } from "@/types/yandex-maps";
import { openRouteBalloon } from "@/store/route-slice";
import type { AppDispatch } from "@/store";


/**
 * Получает DOM элемент контейнера карты
 */
const getMapContainerElement = (map: YandexMap): HTMLElement | null => {
  try {
    // Способ 1: через container.getElement()
    const container = (map as any).container;
    if (container) {
      if (typeof container.getElement === 'function') {
        return container.getElement();
      }
      if (container instanceof HTMLElement) {
        return container;
      }
      if (container.nodeType === 1) {
        return container as HTMLElement;
      }
    }
    
    // Способ 2: через container напрямую
    if ((map as any).container && (map as any).container.getBoundingClientRect) {
      return (map as any).container;
    }
  } catch (e) {
    console.warn('Failed to get map container element:', e);
  }
  
  return null;
};

/**
 * Преобразует координаты карты в пиксели на экране
 */
const coordinatesToPixels = (
  map: YandexMap,
  coordinates: [number, number]
): { x: number; y: number } | null => {
  if (!window.ymaps || !map) return null;
  
  try {
    const mapElement = getMapContainerElement(map);
    if (!mapElement) {
      console.warn('Could not get map container element');
      return null;
    }
    
    // Способ 1: Используем coordSystem API
    const pixelPoint = (map as any).coordSystem?.globalToPixel?.(coordinates);
    if (pixelPoint && Array.isArray(pixelPoint) && pixelPoint.length >= 2) {
      const rect = mapElement.getBoundingClientRect();
      return {
        x: rect.left + pixelPoint[0],
        y: rect.top + pixelPoint[1],
      };
    }
    
    // Способ 2: Используем приблизительное вычисление
    const rect = mapElement.getBoundingClientRect();
    const center = (map as any).getCenter ? (map as any).getCenter() : null;
    const zoom = map.getZoom ? map.getZoom() : 10;
    
    if (center) {
      const centerPixels = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      
      // Вычисляем смещение от центра
      const latDiff = coordinates[0] - center[0];
      const lonDiff = coordinates[1] - center[1];
      
      // Приблизительное преобразование (1 градус ≈ 111 км)
      const pixelsPerDegree = Math.pow(2, zoom) * 256 / 360;
      const offsetX = lonDiff * pixelsPerDegree * Math.cos(center[0] * Math.PI / 180);
      const offsetY = -latDiff * pixelsPerDegree;
      
      return {
        x: centerPixels.x + offsetX,
        y: centerPixels.y + offsetY,
      };
    }
  } catch (e) {
    console.warn('Failed to convert coordinates to pixels:', e);
  }
  
  return null;
};

/**
 * Добавляет обработчик клика для маршрута (вызывается один раз при создании маршрута)
 * @param route - Объект MultiRoute из Yandex Maps
 * @param routeIndex - Индекс маршрута (начиная с 0)
 * @param destination - Пункт назначения
 * @param map - Объект карты Yandex Maps
 * @param dispatch - Redux dispatch функция
 */
/**
 * Скрывает стандартный balloon Yandex Maps
 */
const hideStandardBalloon = (route: YandexMultiRoute): void => {
  try {
    // Пробуем несколько способов скрыть стандартный balloon
    const balloon = (route as any).balloon;
    
    if (balloon) {
      // Способ 1: Закрыть balloon
      if (typeof balloon.close === 'function') {
        balloon.close();
      }
      
      // Способ 2: Скрыть через элемент
      const balloonData = balloon.getData?.();
      if (balloonData?.element) {
        balloonData.element.style.display = 'none';
        balloonData.element.style.visibility = 'hidden';
        balloonData.element.style.opacity = '0';
      }
    }
    
    // Способ 3: Найти все элементы balloon в DOM и скрыть их (более агрессивный)
    const hideBalloons = () => {
      const balloonElements = document.querySelectorAll(
        '[class*="ymaps-2-1"][class*="balloon"], ' +
        '[class*="ymaps-2-1"][class*="route-content"], ' +
        '[class*="ymaps-2-1"][class*="balloon__content"]'
      );
      balloonElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = 'none';
        htmlEl.style.visibility = 'hidden';
        htmlEl.style.opacity = '0';
        htmlEl.style.pointerEvents = 'none';
      });
    };
    
    // Скрываем сразу и через небольшую задержку (на случай, если balloon еще не отрендерился)
    hideBalloons();
    setTimeout(hideBalloons, 10);
    setTimeout(hideBalloons, 50);
    setTimeout(hideBalloons, 100);
  } catch (e) {
    console.warn('Failed to hide standard balloon:', e);
  }
};

// Глобальный обработчик для скрытия всех balloon Yandex Maps
if (typeof window !== 'undefined') {
  const observer = new MutationObserver(() => {
    const balloonElements = document.querySelectorAll(
      '[class*="ymaps-2-1"][class*="balloon"], ' +
      '[class*="ymaps-2-1"][class*="route-content"]'
    );
    balloonElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      // Проверяем, не наш ли это кастомный balloon
      if (!htmlEl.closest('[class*="route-balloon"]')) {
        htmlEl.style.display = 'none';
        htmlEl.style.visibility = 'hidden';
        htmlEl.style.opacity = '0';
      }
    });
  });

  // Начинаем наблюдение за изменениями в DOM
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

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
    
    // Предотвращаем всплытие события, чтобы оно не обрабатывалось обработчиком на map-container
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

    // Получаем данные маршрута
    const durationProp = activeRoute.properties.get("duration");
    const distanceProp = activeRoute.properties.get("distance");
    
    const duration = (typeof durationProp === 'object' && durationProp !== null && 'value' in durationProp)
      ? durationProp.value || 0
      : 0;
    const distance = (typeof distanceProp === 'object' && distanceProp !== null && 'value' in distanceProp)
      ? distanceProp.value || 0
      : 0;

    // Получаем координаты клика из события
    let clickCoords: [number, number] | null = null;
    try {
      const coords = event?.get('coords');
      if (coords && Array.isArray(coords) && coords.length === 2) {
        clickCoords = coords as [number, number];
      }
    } catch (e) {
      console.warn('Failed to get coords from event:', e);
    }

    // Если координаты клика не найдены, используем координаты середины маршрута
    if (!clickCoords) {
      const path = activeRoute.getPath();
      if (path && path.length > 0) {
        const midIndex = Math.floor(path.length / 2);
        clickCoords = path[midIndex] as [number, number];
      } else {
        // Fallback: используем координаты пункта назначения
        clickCoords = destination.coordinates;
      }
    }

    // Пробуем получить координаты мыши из события разными способами
    let mousePosition: { x: number; y: number } | null = null;
    
    try {
      // Способ 1: originalEvent
      const originalEvent = event?.get('originalEvent') as MouseEvent | undefined;
      if (originalEvent && typeof originalEvent.clientX === 'number' && typeof originalEvent.clientY === 'number') {
        mousePosition = {
          x: originalEvent.clientX,
          y: originalEvent.clientY,
        };
        console.log('Got mouse position from originalEvent:', mousePosition);
      } else {
        // Способ 2: Пробуем получить из других свойств события
        const domEvent = (event as any)?.originalEvent || (event as any)?.domEvent;
        if (domEvent && typeof domEvent.clientX === 'number' && typeof domEvent.clientY === 'number') {
          mousePosition = {
            x: domEvent.clientX,
            y: domEvent.clientY,
          };
          console.log('Got mouse position from domEvent:', mousePosition);
        }
      }
    } catch (e) {
      console.warn('Failed to get mouse event:', e);
    }
    
    // Если не получили координаты мыши, пробуем преобразовать координаты карты
    if (!mousePosition) {
      const pixelPosition = coordinatesToPixels(map, clickCoords);
      if (pixelPosition) {
        mousePosition = pixelPosition;
        console.log('Got position from coordinates conversion:', mousePosition);
      }
    }

    // Если все еще нет позиции, используем центр карты
    if (!mousePosition) {
      console.warn('Could not determine position, using center of map');
      const mapElement = getMapContainerElement(map);
      if (mapElement) {
        const rect = mapElement.getBoundingClientRect();
        mousePosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }
    
    if (mousePosition && typeof mousePosition.x === 'number' && typeof mousePosition.y === 'number' && !isNaN(mousePosition.x) && !isNaN(mousePosition.y)) {
      console.log('Opening custom balloon at position:', mousePosition);
      
      // Используем setTimeout, чтобы убедиться, что событие клика полностью обработано
      // и не будет конфликта с обработчиком на map-container
      setTimeout(() => {
        dispatch(openRouteBalloon({
          data: {
            routeIndex,
            destination,
            duration,
            distance,
          },
          position: mousePosition!,
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

/**
 * Устанавливает кастомный balloonContent для маршрута (вызывается после requestsuccess)
 * Теперь не используется, так как мы используем кастомный React компонент
 */
export const setRouteBalloonContent = (): void => {
  // Функция больше не нужна, так как используем кастомный React компонент
};

