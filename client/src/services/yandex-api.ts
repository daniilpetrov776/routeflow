import type { YandexGeocodeResponse, YandexSuggestResponse } from '@/types/yandex-maps';

const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

export class YandexApiService {
  private static instance: YandexApiService;

  static getInstance(): YandexApiService {
    if (!YandexApiService.instance) {
      YandexApiService.instance = new YandexApiService();
    }
    return YandexApiService.instance;
  }

  async geocode(address: string): Promise<YandexGeocodeResponse> {
    if (!API_KEY) {
      throw new Error('Yandex Maps API key not configured');
    }

    const response = await fetch(
      `/api/geocode?address=${encodeURIComponent(address)}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getSuggestions(text: string): Promise<YandexSuggestResponse> {
    if (!API_KEY) {
      throw new Error('Yandex Maps API key not configured');
    }

    const response = await fetch(
      `/api/suggest?text=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error(`Suggestions failed: ${response.statusText}`);
    }

    return response.json();
  }

  async calculateRoutes(startingPoint: any, destinations: any[], transportMode: string) {
    const response = await fetch('/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startingPoint,
        destinations,
        transportMode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Route calculation failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const yandexApi = YandexApiService.getInstance();
