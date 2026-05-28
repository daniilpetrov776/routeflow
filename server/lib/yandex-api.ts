import { getYandexMapsApiKey, getYandexOrgSearchApiKey } from "./api-keys";
import { retry } from "./retry";

/** Короткий TTL для соответствия условиям бесплатного использования Яндекс.Карт */
const GEOCODER_CACHE_TTL_MS = 15 * 60 * 1000;
const GEOSUGGEST_CACHE_TTL_MS = 10 * 60 * 1000;
const ORG_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const geocoderCache = new Map<string, CacheEntry<unknown>>();
const geosuggestCache = new Map<string, CacheEntry<unknown>>();
const orgSearchCache = new Map<string, CacheEntry<unknown>>();

export interface GeosuggestOptions {
  results?: number;
  ll?: string;
  spn?: string;
  bbox?: string;
  types?: string;
}

export interface GeosuggestResultItem {
  title?: { text?: string };
  subtitle?: { text?: string };
  tags?: string[];
  address?: { formatted_address?: string };
  uri?: string;
}

export interface GeosuggestResponse {
  results?: GeosuggestResultItem[];
}

export interface OrgSearchOptions {
  results?: number;
  ll?: string;
  spn?: string;
  bbox?: string;
  type?: "biz" | "geo";
}

export interface OrgSearchFeature {
  properties?: {
    name?: string;
    description?: string;
    uri?: string;
    CompanyMetaData?: {
      name?: string;
      address?: string;
      Address?: { formatted?: string };
      Categories?: Array<{ name?: string }>;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

export interface OrgSearchResponse {
  features?: OrgSearchFeature[];
}

function getFromCache<T>(cache: Map<string, CacheEntry<unknown>>, key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<unknown>>, key: string, data: T, ttlMs: number) {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    data,
  });
}

function shouldRetryYandexError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return true;
    }
    if (error.message.match(/5\d{2}/)) {
      return true;
    }
  }
  return false;
}

/**
 * Создает URL для запроса к Yandex Geocoder API
 */
export function buildGeocoderUrl(query: string, results: number = 10): string {
  const apiKey = getYandexMapsApiKey();
  const encodedQuery = encodeURIComponent(query);
  return `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodedQuery}&format=json&results=${results}&lang=ru_RU`;
}

/**
 * Создает URL для геокодирования по uri из Geosuggest
 */
export function buildGeocoderUriUrl(uri: string): string {
  const apiKey = getYandexMapsApiKey();
  const encodedUri = encodeURIComponent(uri);
  return `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&uri=${encodedUri}&format=json&lang=ru_RU`;
}

/**
 * Создает URL для запроса к Yandex Geosuggest API
 */
export function buildGeosuggestUrl(text: string, options: GeosuggestOptions = {}): string {
  const apiKey = getYandexMapsApiKey();
  const params = new URLSearchParams({
    apikey: apiKey,
    text,
    lang: "ru",
    results: String(options.results ?? 10),
    types: options.types ?? "biz,geo",
    print_address: "1",
    attrs: "uri",
  });

  if (options.ll) {
    params.set("ll", options.ll);
    params.set("ull", options.ll);
  }
  if (options.spn) {
    params.set("spn", options.spn);
  }
  if (options.bbox) {
    params.set("bbox", options.bbox);
  }

  return `https://suggest-maps.yandex.ru/v1/suggest?${params.toString()}`;
}

/**
 * Создает URL для запроса к API Поиска по организациям
 */
export function buildOrgSearchUrl(text: string, options: OrgSearchOptions = {}): string {
  const apiKey = getYandexOrgSearchApiKey();
  const params = new URLSearchParams({
    apikey: apiKey,
    text,
    lang: "ru_RU",
    results: String(options.results ?? 10),
    type: options.type ?? "biz",
  });

  if (options.ll) {
    params.set("ll", options.ll);
  }
  if (options.spn) {
    params.set("spn", options.spn);
  }
  if (options.bbox) {
    params.set("bbox", options.bbox);
  }

  return `https://search-maps.yandex.ru/v1/?${params.toString()}`;
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
  const cacheKey = `geocode:${results}:${query.trim().toLowerCase()}`;
  const cached = getFromCache<unknown>(geocoderCache, cacheKey);
  if (cached) {
    return cached;
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
      shouldRetry: shouldRetryYandexError,
    },
    `Yandex Geocoder API request for "${query}"`
  );

  setCache(geocoderCache, cacheKey, data, GEOCODER_CACHE_TTL_MS);

  return data;
}

/**
 * Геокодирует объект по uri из Geosuggest
 */
export async function fetchGeocoderByUri(uri: string) {
  const cacheKey = `geocode-uri:${uri}`;
  const cached = getFromCache<unknown>(geocoderCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildGeocoderUriUrl(uri);

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
      shouldRetry: shouldRetryYandexError,
    },
    "Yandex Geocoder API request by uri"
  );

  setCache(geocoderCache, cacheKey, data, GEOCODER_CACHE_TTL_MS);

  return data;
}

/**
 * Выполняет запрос к Yandex Geosuggest API
 */
export async function fetchGeosuggestData(text: string, options: GeosuggestOptions = {}) {
  const cacheKey = [
    "geosuggest",
    text.trim().toLowerCase(),
    options.ll ?? "",
    options.spn ?? "",
    options.bbox ?? "",
    options.types ?? "biz,geo",
    String(options.results ?? 10),
  ].join("|");

  const cached = getFromCache<GeosuggestResponse>(geosuggestCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildGeosuggestUrl(text, options);

  const data = await retry(
    async () => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Yandex Geosuggest API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as GeosuggestResponse;
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: shouldRetryYandexError,
    },
    `Yandex Geosuggest API request for "${text}"`
  );

  setCache(geosuggestCache, cacheKey, data, GEOSUGGEST_CACHE_TTL_MS);

  return data;
}

/**
 * Выполняет запрос к API Поиска по организациям Yandex
 */
export async function fetchOrgSearchData(text: string, options: OrgSearchOptions = {}) {
  const apiKey = getYandexOrgSearchApiKey();
  if (!apiKey) {
    throw new Error("Yandex Org Search API key not configured");
  }

  const cacheKey = [
    "org-search",
    text.trim().toLowerCase(),
    options.ll ?? "",
    options.spn ?? "",
    options.bbox ?? "",
    options.type ?? "biz",
    String(options.results ?? 10),
  ].join("|");

  const cached = getFromCache<OrgSearchResponse>(orgSearchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildOrgSearchUrl(text, options);

  const data = await retry(
    async () => {
      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const details = errorBody ? `: ${errorBody.slice(0, 200)}` : "";
        throw new Error(`Yandex Org Search API error: ${response.status} ${response.statusText}${details}`);
      }

      return (await response.json()) as OrgSearchResponse;
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: shouldRetryYandexError,
    },
    `Yandex Org Search API request for "${text}"`
  );

  setCache(orgSearchCache, cacheKey, data, ORG_SEARCH_CACHE_TTL_MS);

  return data;
}
