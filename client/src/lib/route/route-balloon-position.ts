import type { AddressPoint, RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute, YandexMap } from "@/types/yandex-maps";
import type { Coordinates } from "@/types/yandex-maps";
import { coordinatesToPixels } from "../balloon";

function getRouteOptionPolyline(routeOption: RouteOption): [number, number][] | null {
  const idx = routeOption.selectedAlternativeIndex ?? 0;
  const alt = routeOption.alternatives?.[idx];
  if (alt?.geometry?.coordinates?.length) {
    return alt.geometry.coordinates;
  }
  if (routeOption.geometry?.coordinates?.length) {
    return routeOption.geometry.coordinates;
  }
  return null;
}

/**
 * Получает координаты середины маршрута
 */
export const getRouteMidpoint = (route: YandexMultiRoute): Coordinates | null => {
  try {
    const activeRoute = route.getActiveRoute();
    if (!activeRoute) {
      // Пробуем получить первый маршрут из модели
      const routes = route.model.getRoutes();
      if (routes.length === 0) {
        return null;
      }
      const firstRoute = routes[0];
      
      // Пробуем разные способы получения пути
      if (typeof firstRoute.getPath === 'function') {
        const path = firstRoute.getPath();
        if (path && path.length > 0) {
          const midIndex = Math.floor(path.length / 2);
          return path[midIndex] as Coordinates;
        }
      }
      
      // Альтернативный способ через geometry
      const geometry = (firstRoute as any).geometry;
      if (geometry && geometry.getCoordinates) {
        const coords = geometry.getCoordinates();
        if (coords && coords.length > 0) {
          const midIndex = Math.floor(coords.length / 2);
          return coords[midIndex] as Coordinates;
        }
      }
      
      return null;
    }

    // Пробуем получить путь через getPath
    if (typeof activeRoute.getPath === 'function') {
      const path = activeRoute.getPath();
      if (path && path.length > 0) {
        const midIndex = Math.floor(path.length / 2);
        return path[midIndex] as Coordinates;
      }
    }
    
    // Альтернативный способ через geometry
    const geometry = (activeRoute as any).geometry;
    if (geometry && geometry.getCoordinates) {
      const coords = geometry.getCoordinates();
      if (coords && coords.length > 0) {
        const midIndex = Math.floor(coords.length / 2);
        return coords[midIndex] as Coordinates;
      }
    }
    
    // Еще один способ - через properties
    const pathProperty = (activeRoute as any).properties?.get?.('path');
    if (pathProperty && Array.isArray(pathProperty) && pathProperty.length > 0) {
      const midIndex = Math.floor(pathProperty.length / 2);
      return pathProperty[midIndex] as Coordinates;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get route midpoint:', error);
    return null;
  }
};

/**
 * Получает координаты середины маршрута из RouteOption
 */
export const getRouteMidpointFromOption = (
  routeOption: RouteOption,
  startingPoint?: AddressPoint
): Coordinates | null => {
  const polyline = getRouteOptionPolyline(routeOption);
  if (polyline && polyline.length > 0) {
    const coords = polyline;
    
    // Если есть больше 2 точек, используем середину массива
    if (coords.length > 2) {
      const midIndex = Math.floor(coords.length / 2);
      return coords[midIndex];
    }
    
    // Если только 2 точки (начало и конец), вычисляем середину между ними
    if (coords.length === 2) {
      const [start, end] = coords;
      return [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
      ] as Coordinates;
    }
    
    // Если только одна точка
    if (coords.length === 1) {
      return coords[0];
    }
  }

  // Если нет geometry, но есть startingPoint, вычисляем середину между началом и назначением
  if (startingPoint) {
    const dest = routeOption.destination;
    return [
      (startingPoint.coordinates[0] + dest.coordinates[0]) / 2,
      (startingPoint.coordinates[1] + dest.coordinates[1]) / 2,
    ] as Coordinates;
  }
  
  return null;
};

/**
 * Пересчитывает позицию balloon для маршрута
 */
export const recalculateBalloonPosition = (
  route: YandexMultiRoute,
  map: YandexMap,
  destination: AddressPoint,
  routeOption?: RouteOption,
  startingPoint?: AddressPoint
): { x: number; y: number } | null => {
  let routeCoords: Coordinates | null = null;
  
  // Сначала пробуем использовать данные из RouteOption (более надежно)
  if (routeOption) {
    routeCoords = getRouteMidpointFromOption(routeOption, startingPoint);
  }
  
  // Если не получилось, пробуем получить из YandexMultiRoute
  if (!routeCoords) {
    routeCoords = getRouteMidpoint(route);
  }
  
  // Если все еще нет координат, вычисляем середину между началом и назначением
  if (!routeCoords && startingPoint) {
    routeCoords = [
      (startingPoint.coordinates[0] + destination.coordinates[0]) / 2,
      (startingPoint.coordinates[1] + destination.coordinates[1]) / 2,
    ] as Coordinates;
  }
  
  // Если все еще нет координат, используем координаты пункта назначения
  if (!routeCoords) {
    routeCoords = destination.coordinates;
  }

  // Преобразуем координаты в пиксели
  return coordinatesToPixels(map, routeCoords);
};

