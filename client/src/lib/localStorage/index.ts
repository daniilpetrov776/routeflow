/**
 * Экспорт всех функций для работы с localStorage
 */

// Базовые функции
export {
  setItem,
  getItem,
  getItemWithDefault,
  removeItem,
  clear,
  hasItem,
  getAllKeys,
  LocalStorageError,
} from './storage';

// Функции для работы с маршрутами
export {
  loadSavedRoutes,
  saveRoute,
  deleteRoute,
  getRouteById,
  getAllRoutes,
  hasSavedRoutes,
  clearAllRoutes,
  updateRouteName,
  type SavedRoute,
  type SavedRoutes,
} from './routes';

