import { getYandexMapsApiKey } from "./api-keys";
import { retry } from "./retry";

const GEOCODER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface GeocoderCacheEntry {
  expiresAt: number;
  data: any;
}

const geocoderCache = new Map<string, GeocoderCacheEntry>();

/**
 * Создает URL для запроса к Yandex Geocoder API
 */
export function buildGeocoderUrl(query: string, results: number = 10): string {
  const apiKey = getYandexMapsApiKey();
  const encodedQuery = encodeURIComponent(query);
  return `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodedQuery}&format=json&results=${results}&lang=ru_RU`;
}

/**
 * Создает URL для загрузки Yandex Maps JavaScript API
 */
export function buildMapsScriptUrl(): string {
  const apiKey = getYandexMapsApiKey();
  return `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
}

/**
 * Выполняет запрос к Yandex Geocoder API с повторными попытками при ошибках
 */
export async function fetchGeocoderData(query: string, results: number = 10) {
  const cacheKey = `${results}:${query.trim().toLowerCase()}`;
  const cached = geocoderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = buildGeocoderUrl(query, results);
  
  const data = await retry(
    async () => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Yandex Geocoder API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: (error) => {
        // Повторяем для сетевых ошибок и ошибок сервера (5xx), но не для клиентских ошибок (4xx)
        if (error instanceof Error) {
          // Сетевые ошибки
          if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            return true;
          }
          // Ошибки сервера (5xx)
          if (error.message.match(/5\d{2}/)) {
            return true;
          }
        }
        return false;
      },
    },
    `Yandex Geocoder API request for "${query}"`
  );

  geocoderCache.set(cacheKey, {
    expiresAt: Date.now() + GEOCODER_CACHE_TTL_MS,
    data,
  });

  return data;
}

