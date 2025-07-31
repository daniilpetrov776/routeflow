import { configureStore } from '@reduxjs/toolkit';
import routeReducer from './route-slice';
import themeReducer from './theme-slice';

export const store = configureStore({
  reducer: {
    route: routeReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
