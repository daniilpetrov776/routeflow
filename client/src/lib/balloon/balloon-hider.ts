import type { YandexMultiRoute } from "@/types/yandex-maps";

/**
 * Скрывает стандартный balloon Yandex Maps для конкретного маршрута
 */
export const hideStandardBalloon = (route: YandexMultiRoute): void => {
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

/**
 * Инициализирует глобальный обработчик для скрытия всех balloon Yandex Maps
 */
export const initGlobalBalloonHider = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

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
};

