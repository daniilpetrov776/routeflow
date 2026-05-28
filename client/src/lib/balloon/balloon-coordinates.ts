import type { YandexMap } from "@/types/yandex-maps";
import type { Coordinates } from "@/types/yandex-maps";
import { getMapContainerElement } from "./balloon-dom";

/**
 * Преобразует координаты карты в пиксели на экране
 */
export const coordinatesToPixels = (
  map: YandexMap,
  coordinates: Coordinates
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
 * Получает позицию мыши из события Yandex Maps
 */
export const getMousePositionFromEvent = (
  event: any,
  map: YandexMap,
  fallbackCoords: Coordinates
): { x: number; y: number } | null => {
  // Способ 1: originalEvent
  try {
    const originalEvent = event?.get?.('originalEvent') as MouseEvent | undefined;
    if (originalEvent && typeof originalEvent.clientX === 'number' && typeof originalEvent.clientY === 'number') {
      return {
        x: originalEvent.clientX,
        y: originalEvent.clientY,
      };
    }
    
    // Способ 2: Пробуем получить из других свойств события
    const domEvent = (event as any)?.originalEvent || (event as any)?.domEvent;
    if (domEvent && typeof domEvent.clientX === 'number' && typeof domEvent.clientY === 'number') {
      return {
        x: domEvent.clientX,
        y: domEvent.clientY,
      };
    }
  } catch (e) {
    console.warn('Failed to get mouse event:', e);
  }
  
  // Способ 3: Преобразуем координаты карты в пиксели
  const pixelPosition = coordinatesToPixels(map, fallbackCoords);
  if (pixelPosition) {
    return pixelPosition;
  }
  
  // Способ 4: Используем центр карты
  const mapElement = getMapContainerElement(map);
  if (mapElement) {
    const rect = mapElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  
  return null;
};

/**
 * Получает координаты клика из события
 */
export const getClickCoordinates = (event: any): Coordinates | null => {
  try {
    const coords = event?.get?.('coords');
    if (coords && Array.isArray(coords) && coords.length === 2) {
      return coords as Coordinates;
    }
  } catch (e) {
    console.warn('Failed to get coords from event:', e);
  }
  
  return null;
};

