import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { showMapLoadError } from '@/lib/error-toast';
import { initGlobalBalloonHider } from '@/lib/balloon';

export function useYandexMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Инициализируем глобальный обработчик для скрытия стандартных balloon
    initGlobalBalloonHider();

    // Check if Yandex Maps is already loaded
    if (window.ymaps) {
      setIsLoaded(true);
      return;
    }

    // Получаем конфигурацию Yandex Maps с сервера
    let script: HTMLScriptElement | null = null;

    const loadYandexMaps = async () => {
      try {
        const response = await apiRequest('GET', '/api/yandex-maps/config');
        const config = await response.json();

        if (!config.scriptUrl) {
          const errorMessage = 'Не удалось получить конфигурацию Yandex Maps с сервера';
          setError(errorMessage);
          showMapLoadError(errorMessage);
          return;
        }

        // Create script element
        script = document.createElement('script');
        script.src = config.scriptUrl;
        script.async = true;

        script.onload = () => {
          setIsLoaded(true);
        };

        script.onerror = () => {
          const errorMessage = 'Не удалось загрузить Yandex Maps API';
          setError(errorMessage);
          showMapLoadError(errorMessage);
        };

        document.head.appendChild(script);
      } catch (err) {
        console.error('Failed to load Yandex Maps config:', err);
        const errorMessage = err instanceof Error
            ? err.message
          : 'Не удалось загрузить конфигурацию Yandex Maps';
        setError(errorMessage);
        showMapLoadError(errorMessage);
      }
    };

    loadYandexMaps();

    return () => {
      // Cleanup: удаляем скрипт только если он еще не загружен
      if (script && script.parentNode && !isLoaded) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return { isLoaded, error };
}
