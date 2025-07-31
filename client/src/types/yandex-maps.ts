export interface YandexGeocodeResponse {
  response: {
    GeoObjectCollection: {
      featureMember: Array<{
        GeoObject: {
          metaDataProperty: {
            GeocoderMetaData: {
              precision: string;
              text: string;
              kind: string;
            };
          };
          name: string;
          description: string;
          Point: {
            pos: string;
          };
        };
      }>;
    };
  };
}

export interface YandexSuggestResponse {
  results: Array<{
    title: {
      text: string;
    };
    subtitle?: {
      text: string;
    };
    pos: string;
  }>;
}

export interface YandexRouteResponse {
  route: Array<{
    duration: {
      value: number;
      text: string;
    };
    distance: {
      value: number;
      text: string;
    };
    geometry: {
      coordinates: number[][];
    };
    traffic_info?: {
      level: 'light' | 'moderate' | 'heavy';
    };
  }>;
}

export interface RouteRequest {
  waypoints: Array<{
    position: [number, number];
  }>;
  mode: 'walking' | 'cycling' | 'transit' | 'driving';
  route_options: {
    alternatives: boolean;
    avoid_tolls: boolean;
    avoid_unpaved: boolean;
  };
}
