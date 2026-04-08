/**
 * Библиотека для работы с сохранением маршрутов в localStorage
 */

import type { AddressPoint, TransportMode, RouteOption } from '@/store/route-slice';
import { getItem, setItem, removeItem, hasItem } from './storage';

/**
 * Ключ для сохранения маршрутов в localStorage
 */
const ROUTES_STORAGE_KEY = 'routeflow_routes';

/**
 * Структура сохраненного маршрута
 */
export interface SavedRoute {
  id: string;
  name?: string;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  transportMode: TransportMode;
  routes: RouteOption[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Структура всех сохраненных маршрутов
 */
export interface SavedRoutes {
  routes: SavedRoute[];
  version: number; // Версия формата для миграций в будущем
}

/**
 * Версия формата данных
 */
const CURRENT_VERSION = 1;

/**
 * Генерирует уникальный ID для маршрута
 */
function generateRouteId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Загружает все сохраненные маршруты
 * @returns Объект с сохраненными маршрутами или null, если ничего не сохранено
 * @throws {LocalStorageError} Если произошла ошибка при загрузке
 */
export function loadSavedRoutes(): SavedRoutes | null {
  const data = getItem<SavedRoutes>(ROUTES_STORAGE_KEY);
  
  if (!data) {
    return null;
  }

  // Проверка версии и миграция при необходимости
  if (data.version !== CURRENT_VERSION) {
    // В будущем здесь можно добавить логику миграции
    console.warn(`Версия данных (${data.version}) не совпадает с текущей (${CURRENT_VERSION})`);
  }

  return data;
}

/**
 * Сохраняет маршрут
 * @param route - Данные маршрута для сохранения
 * @param routeId - ID существующего маршрута (для обновления) или undefined (для создания нового)
 * @returns ID сохраненного маршрута
 * @throws {LocalStorageError} Если произошла ошибка при сохранении
 */
export function saveRoute(
  route: Omit<SavedRoute, 'id' | 'createdAt' | 'updatedAt'>,
  routeId?: string
): string {
  const existing = loadSavedRoutes();
  const routes = existing?.routes || [];
  
  const now = Date.now();
  const id = routeId || generateRouteId();
  
  const savedRoute: SavedRoute = {
    id,
    ...route,
    createdAt: routeId 
      ? routes.find(r => r.id === routeId)?.createdAt || now 
      : now,
    updatedAt: now,
  };

  // Если это обновление существующего маршрута
  if (routeId) {
    const index = routes.findIndex(r => r.id === routeId);
    if (index >= 0) {
      routes[index] = savedRoute;
    } else {
      routes.push(savedRoute);
    }
  } else {
    routes.push(savedRoute);
  }

  const savedRoutes: SavedRoutes = {
    routes,
    version: CURRENT_VERSION,
  };

  setItem(ROUTES_STORAGE_KEY, savedRoutes);
  return id;
}

/**
 * Удаляет маршрут по ID
 * @param routeId - ID маршрута для удаления
 * @returns true, если маршрут был удален, false если не найден
 * @throws {LocalStorageError} Если произошла ошибка при удалении
 */
export function deleteRoute(routeId: string): boolean {
  const existing = loadSavedRoutes();
  
  if (!existing) {
    return false;
  }

  const index = existing.routes.findIndex(r => r.id === routeId);
  if (index < 0) {
    return false;
  }

  existing.routes.splice(index, 1);

  if (existing.routes.length === 0) {
    removeItem(ROUTES_STORAGE_KEY);
  } else {
    setItem(ROUTES_STORAGE_KEY, existing);
  }

  return true;
}

/**
 * Получает маршрут по ID
 * @param routeId - ID маршрута
 * @returns Сохраненный маршрут или null, если не найден
 * @throws {LocalStorageError} Если произошла ошибка при загрузке
 */
export function getRouteById(routeId: string): SavedRoute | null {
  const existing = loadSavedRoutes();
  
  if (!existing) {
    return null;
  }

  return existing.routes.find(r => r.id === routeId) || null;
}

/**
 * Получает все сохраненные маршруты
 * @returns Массив всех сохраненных маршрутов
 * @throws {LocalStorageError} Если произошла ошибка при загрузке
 */
export function getAllRoutes(): SavedRoute[] {
  const existing = loadSavedRoutes();
  return existing?.routes || [];
}

/**
 * Проверяет, есть ли сохраненные маршруты
 * @returns true, если есть сохраненные маршруты
 */
export function hasSavedRoutes(): boolean {
  return hasItem(ROUTES_STORAGE_KEY);
}

/**
 * Очищает все сохраненные маршруты
 * @throws {LocalStorageError} Если произошла ошибка при очистке
 */
export function clearAllRoutes(): void {
  removeItem(ROUTES_STORAGE_KEY);
}

/**
 * Обновляет имя маршрута
 * @param routeId - ID маршрута
 * @param name - Новое имя маршрута
 * @returns true, если маршрут был обновлен, false если не найден
 * @throws {LocalStorageError} Если произошла ошибка при обновлении
 */
export function updateRouteName(routeId: string, name: string): boolean {
  const route = getRouteById(routeId);
  
  if (!route) {
    return false;
  }

  saveRoute(
    {
      startingPoint: route.startingPoint,
      destinations: route.destinations,
      transportMode: route.transportMode,
      routes: route.routes,
      name,
    },
    routeId
  );

  return true;
}

