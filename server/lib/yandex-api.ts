import { getYandexMapsApiKey } from "./api-keys";

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
 * Выполняет запрос к Yandex Geocoder API
 */
export async function fetchGeocoderData(query: string, results: number = 10) {
  const url = buildGeocoderUrl(query, results);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Yandex Geocoder API error: ${response.statusText}`);
  }

  return await response.json();
}

