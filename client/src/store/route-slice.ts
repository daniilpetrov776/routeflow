import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getItemWithDefault, setItem } from '@/lib/localStorage';

export type TransportMode = 'walking' | 'cycling' | 'transit' | 'driving';

const PERSIST_ROUTES_KEY = 'routeflow_persist_routes';

export interface AddressPoint {
  address: string;
  coordinates: [number, number];
}

export interface RouteOption {
  id: string;
  destination: AddressPoint;
  duration: number;
  distance: number;
  traffic_info: {
    level: 'light' | 'moderate' | 'heavy';
  };
  geometry?: {
    coordinates: [number, number][];
  };
}

export interface RouteBalloonData {
  routeIndex: number;
  destination: AddressPoint;
  duration: number;
  distance: number;
}

export interface RouteBalloonState {
  data: RouteBalloonData | null;
  position: { x: number; y: number } | null;
  requestedRouteIndex: number | null; // Индекс маршрута, для которого запрошено открытие balloon
}

export interface RouteState {
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  transportMode: TransportMode;
  routes: RouteOption[];

  isCalculating: boolean;
  error: string | null;
  balloon: RouteBalloonState;
  persistRoutes: boolean; // Сохранять ли маршруты между перезагрузками
}

const getInitialPersistRoutes = (): boolean => {
  return getItemWithDefault<boolean>(PERSIST_ROUTES_KEY, false);
};

const initialState: RouteState = {
  startingPoint: null,
  destinations: [],
  transportMode: 'walking',
  routes: [],

  isCalculating: false,
  error: null,
  balloon: {
    data: null,
    position: null,
    requestedRouteIndex: null,
  },
  persistRoutes: getInitialPersistRoutes(),
};

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setStartingPoint: (state, action: PayloadAction<AddressPoint>) => {
      state.startingPoint = action.payload;
      state.error = null;
    },
    clearStartingPoint: (state) => {
      state.startingPoint = null;
      state.error = null;
    },
    addDestination: (state, action: PayloadAction<AddressPoint>) => {
      state.destinations.push(action.payload);
      state.error = null;
    },
    setDestinations: (state, action: PayloadAction<AddressPoint[]>) => {
      state.destinations = action.payload;
      state.error = null;
    },
    removeDestination: (state, action: PayloadAction<number>) => {
      const removedIndex = action.payload;
      const removedDestination = state.destinations[removedIndex];
      
      // Закрываем balloon, если он открыт для удаляемого пункта назначения
      if (state.balloon.data && 
          state.balloon.data.destination.address === removedDestination?.address &&
          Math.abs(state.balloon.data.destination.coordinates[0] - (removedDestination?.coordinates[0] || 0)) < 0.0001 &&
          Math.abs(state.balloon.data.destination.coordinates[1] - (removedDestination?.coordinates[1] || 0)) < 0.0001) {
        state.balloon.data = null;
        state.balloon.position = null;
      }
      
      // Удаляем destination
      state.destinations.splice(removedIndex, 1);
      
      // Удаляем соответствующий маршрут из store
      // Находим маршрут по destination (адрес и координаты)
      if (removedDestination && state.routes.length > 0) {
        const routeIndexToRemove = state.routes.findIndex(route => {
          const routeDest = route.destination;
          return (
            routeDest.address === removedDestination.address &&
            Math.abs(routeDest.coordinates[0] - removedDestination.coordinates[0]) < 0.0001 &&
            Math.abs(routeDest.coordinates[1] - removedDestination.coordinates[1]) < 0.0001
          );
        });
        
        if (routeIndexToRemove >= 0) {
          state.routes.splice(routeIndexToRemove, 1);
        }
      }
      
      state.error = null;
    },
    updateDestination: (state, action: PayloadAction<{ index: number; destination: AddressPoint }>) => {
      state.destinations[action.payload.index] = action.payload.destination;
      state.error = null;
    },
    setTransportMode: (state, action: PayloadAction<TransportMode>) => {
      state.transportMode = action.payload;
      state.routes = [];
      state.error = null;
    },
    setRoutes: (state, action: PayloadAction<RouteOption[]>) => {
      state.routes = action.payload;

      state.isCalculating = false;
      state.error = null;
    },

    setCalculating: (state, action: PayloadAction<boolean>) => {
      state.isCalculating = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCalculating = false;
    },
    clearRoutes: (state) => {
      state.routes = [];

      state.error = null;
    },
    openRouteBalloon: (state, action: PayloadAction<{ data: RouteBalloonData; position: { x: number; y: number } }>) => {
      state.balloon.data = action.payload.data;
      state.balloon.position = action.payload.position;
    },
    updateRouteBalloonPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      if (state.balloon.data) {
        state.balloon.position = action.payload;
      }
    },
    updateRouteBalloonData: (state, action: PayloadAction<{ duration: number; distance: number; routeIndex: number }>) => {
      if (state.balloon.data) {
        state.balloon.data.duration = action.payload.duration;
        state.balloon.data.distance = action.payload.distance;
        state.balloon.data.routeIndex = action.payload.routeIndex;
      }
    },
    requestOpenRouteBalloonByIndex: (state, action: PayloadAction<number>) => {
      // Это действие используется для запроса открытия balloon по индексу
      // Фактическое открытие обрабатывается в MapContainer через эффект
      // Здесь мы просто помечаем, что нужно открыть balloon
      state.balloon.requestedRouteIndex = action.payload;
    },
    clearRequestedRouteIndex: (state) => {
      state.balloon.requestedRouteIndex = null;
    },
    closeRouteBalloon: (state) => {
      state.balloon.data = null;
      state.balloon.position = null;
      state.balloon.requestedRouteIndex = null;
    },
    setPersistRoutes: (state, action: PayloadAction<boolean>) => {
      state.persistRoutes = action.payload;
      setItem(PERSIST_ROUTES_KEY, action.payload);
    },
  },
});

export const {
  setStartingPoint,
  clearStartingPoint,
  addDestination,
  setDestinations,
  removeDestination,
  updateDestination,
  setTransportMode,
  setRoutes,
  setCalculating,
  setError,
  clearRoutes,
  openRouteBalloon,
  updateRouteBalloonPosition,
  updateRouteBalloonData,
  requestOpenRouteBalloonByIndex,
  clearRequestedRouteIndex,
  closeRouteBalloon,
  setPersistRoutes,
} = routeSlice.actions;

export default routeSlice.reducer;
