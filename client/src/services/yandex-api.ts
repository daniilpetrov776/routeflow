// import type { YandexGeocodeResponse, YandexSuggestResponse } from '@/types/yandex-maps';

// const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

// export class YandexApiService {
//   private static instance: YandexApiService;

//   static getInstance(): YandexApiService {
//     if (!YandexApiService.instance) {
//       YandexApiService.instance = new YandexApiService();
//     }
//     return YandexApiService.instance;
//   }

//   async geocode(address: string): Promise<YandexGeocodeResponse> {
//     if (!API_KEY) {
//       throw new Error('Yandex Maps API key not configured');
//     }

//     const response = await fetch(
//       `/api/geocode?address=${encodeURIComponent(address)}`
//     );

//     if (!response.ok) {
//       throw new Error(`Geocoding failed: ${response.statusText}`);
//     }

//     return response.json();
//   }

//   async getSuggestions(text: string): Promise<YandexSuggestResponse> {
//     if (!API_KEY) {
//       throw new Error('Yandex Maps API key not configured');
//     }

//     const response = await fetch(
//       `/api/suggest?text=${encodeURIComponent(text)}`
//     );

//     if (!response.ok) {
//       throw new Error(`Suggestions failed: ${response.statusText}`);
//     }

//     return response.json();
//   }

//   async calculateRoutes(startingPoint: any, destinations: any[], transportMode: string) {
//     const response = await fetch('/api/routes', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         startingPoint,
//         destinations,
//         transportMode,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Route calculation failed: ${response.statusText}`);
//     }

//     return response.json();
//   }
// }

// export const yandexApi = YandexApiService.getInstance();

import type { YandexGeocodeResponse, YandexSuggestResponse } from '@/types/yandex-maps';

const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''); // убираем конечный слеш, если есть

function buildUrl(path: string) {
  // Если BASE пустой — используем относительный путь (удобно для локалки)
  return BASE ? `${BASE}${path}` : path;
}

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

    const url = buildUrl(`/api/geocode?address=${encodeURIComponent(address)}`);
    console.log('Geocode request ->', url);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include' // если используешь куки/сессии
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSuggestions(text: string): Promise<YandexSuggestResponse> {
    if (!API_KEY) {
      throw new Error('Yandex Maps API key not configured');
    }

    const url = buildUrl(`/api/suggest?text=${encodeURIComponent(text)}`);
    console.log('Suggest request ->', url);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Suggestions failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async calculateRoutes(startingPoint: any, destinations: any[], transportMode: string) {
    const url = buildUrl('/api/routes');
    console.log('Routes request ->', url);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
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
      throw new Error(`Route calculation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const yandexApi = YandexApiService.getInstance();