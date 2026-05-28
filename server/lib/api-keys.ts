/**
 * Получает API ключ Yandex Maps с сервера
 * @throws {Error} Если ключ не настроен
 */
export function getYandexMapsApiKey(): string {
  const apiKey =
    process.env.YANDEX_MAPS_API_KEY ||
    process.env.VITE_YANDEX_MAPS_API_KEY ||
    "";

  if (!apiKey) {
    throw new Error("Yandex Maps API key not configured");
  }

  return apiKey;
}

/**
 * Ключ для API Поиска по организациям.
 * Можно задать отдельно, если в кабинете Яндекса используется другой ключ.
 */
export function getYandexOrgSearchApiKey(): string {
  return (
    process.env.YANDEX_ORG_SEARCH_API_KEY ||
    process.env.YANDEX_MAPS_API_KEY ||
    process.env.VITE_YANDEX_MAPS_API_KEY ||
    ""
  );
}

