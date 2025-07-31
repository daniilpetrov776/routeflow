import { useState, useEffect } from 'react';

export function useYandexMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Yandex Maps is already loaded
    // @ts-ignore
    if (window.ymaps) {
      setIsLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
    
    if (!apiKey) {
      setError('Yandex Maps API key not found. Please set VITE_YANDEX_MAPS_API_KEY environment variable.');
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError('Failed to load Yandex Maps API');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.head.removeChild(script);
    };
  }, []);

  return { isLoaded, error };
}
