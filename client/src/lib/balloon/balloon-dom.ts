import type { YandexMap } from "@/types/yandex-maps";

/**
 * Получает DOM элемент контейнера карты
 */
export const getMapContainerElement = (map: YandexMap): HTMLElement | null => {
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

