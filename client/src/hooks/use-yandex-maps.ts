import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useYandexMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          setError('Failed to get Yandex Maps configuration from server');
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
          setError('Failed to load Yandex Maps API');
        };

        document.head.appendChild(script);
      } catch (err) {
        console.error('Failed to load Yandex Maps config:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load Yandex Maps configuration'
        );
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
