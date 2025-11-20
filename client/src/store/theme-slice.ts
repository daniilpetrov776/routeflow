import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  theme: Theme;
  actualTheme: 'light' | 'dark';
}

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem('theme') as Theme;
  return stored || 'system';
};

const getInitialActualTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

const initialState: ThemeState = {
  theme: getStoredTheme(),
  actualTheme: getInitialActualTheme(getStoredTheme()),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      
      if (action.payload === 'system') {
        state.actualTheme = getSystemTheme();
      } else {
        state.actualTheme = action.payload;
      }
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
