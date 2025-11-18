import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TransportMode = 'walking' | 'cycling' | 'transit' | 'driving';

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

export interface RouteState {
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  transportMode: TransportMode;
  routes: RouteOption[];

  isCalculating: boolean;
  error: string | null;
}

const initialState: RouteState = {
  startingPoint: null,
  destinations: [],
  transportMode: 'walking',
  routes: [],

  isCalculating: false,
  error: null,
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
    removeDestination: (state, action: PayloadAction<number>) => {
      state.destinations.splice(action.payload, 1);
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
  },
});

export const {
  setStartingPoint,
  clearStartingPoint,
  addDestination,
  removeDestination,
  updateDestination,
  setTransportMode,
  setRoutes,
  setCalculating,
  setError,
  clearRoutes,
} = routeSlice.actions;

export default routeSlice.reducer;
