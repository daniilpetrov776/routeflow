import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TransportMode = 'walking' | 'cycling' | 'transit' | 'driving';

export interface AddressPoint {
  address: string;
  coordinates: [number, number];
}

export interface RouteOption {
  id: string;
  duration: number;
  distance: number;
  traffic: 'light' | 'moderate' | 'heavy';
  cost?: string;
  description?: string;
  geometry: any;
}

export interface RouteState {
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  transportMode: TransportMode;
  routes: RouteOption[];
  selectedRouteId: string | null;
  isCalculating: boolean;
  error: string | null;
}

const initialState: RouteState = {
  startingPoint: null,
  destinations: [],
  transportMode: 'walking',
  routes: [],
  selectedRouteId: null,
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
      state.selectedRouteId = null;
      state.error = null;
    },
    setRoutes: (state, action: PayloadAction<RouteOption[]>) => {
      state.routes = action.payload;
      // Automatically select the fastest route
      if (action.payload.length > 0) {
        const fastestRoute = action.payload.reduce((fastest, current) => 
          current.duration < fastest.duration ? current : fastest
        );
        state.selectedRouteId = fastestRoute.id;
      }
      state.isCalculating = false;
      state.error = null;
    },
    setSelectedRoute: (state, action: PayloadAction<string>) => {
      state.selectedRouteId = action.payload;
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
      state.selectedRouteId = null;
      state.error = null;
    },
  },
});

export const {
  setStartingPoint,
  addDestination,
  removeDestination,
  updateDestination,
  setTransportMode,
  setRoutes,
  setSelectedRoute,
  setCalculating,
  setError,
  clearRoutes,
} = routeSlice.actions;

export default routeSlice.reducer;
