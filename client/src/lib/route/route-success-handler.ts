import { setRoutes, setCalculating, updateRouteBalloonData } from "@/store/route-slice";
import type { RootState } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import { showRouteError } from "@/lib/error-toast";
import { extractRouteProperties } from "./route-properties";
import type { AddressPoint, RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute, YandexMap } from "@/types/yandex-maps";
import {
  ROUTE_COLORS,
  ROUTE_STYLES,
  MAP_BOUNDS_ADJUSTMENT_DELAY,
  MAP_ZOOM_MARGIN,
} from "@/lib/map-constants";

/**
 * Обработчик успешного расчета маршрута
 */
export const createRouteSuccessHandler = (
  route: YandexMultiRoute,
  routeIndex: number,
  startingPoint: AddressPoint,
  destination: AddressPoint,
  routeResults: Array<RouteOption | null>,
  completedRef: { current: number },
  totalDestinations: number,
  routesRef: React.RefObject<YandexMultiRoute[]>,
  yandexMapRef: React.RefObject<YandexMap | null>,
  dispatch: any,
  store?: Store<RootState>
) => {
  return () => {
    // Пытаемся получить активный маршрут, если его нет - берем первый доступный
    let activeRoute = route.getActiveRoute();
    if (!activeRoute) {
      const routes = route.model.getRoutes();
      if (routes.length === 0) {
        console.warn(`No routes available for destination #${routeIndex + 1}`);
        completedRef.current++;
        if (completedRef.current === totalDestinations) {
          const validResults = routeResults.filter((r): r is RouteOption => r !== null);
          if (validResults.length > 0) {
            dispatch(setRoutes(validResults));
          } else {
            showRouteError(
              "Не удалось рассчитать ни один маршрут. Проверьте корректность адресов.",
              true
            );
          }
          dispatch(setCalculating(false));
        }
        return;
      }
      activeRoute = routes[0];
    }

    // Извлекаем свойства маршрута
    const { duration, distance, isBlocked } = extractRouteProperties(activeRoute);

    const opt: RouteOption = {
      id: `route-${routeIndex}`,
      destination,
      duration,
      distance,
      traffic_info: {
        level: isBlocked ? "heavy" : "light",
      },
      geometry: {
        coordinates: [
          startingPoint.coordinates,
          destination.coordinates,
        ],
      },
    };
    console.log("Routes:", route.model.getRoutes());   
    console.log("Route calculation success payload:", opt);

    routeResults[routeIndex] = opt;
    completedRef.current++;

    // Обновляем данные balloon сразу, как только маршрут готов (не ждем все маршруты)
    // Это позволяет обновить данные balloon сразу при пересчете
    if (store) {
      const state = store.getState();
      const balloonData = state.route.balloon.data;
      // Проверяем, что balloon открыт и это тот же destination
      if (balloonData && 
          balloonData.destination.address === destination.address &&
          Math.abs(balloonData.destination.coordinates[0] - destination.coordinates[0]) < 0.0001 &&
          Math.abs(balloonData.destination.coordinates[1] - destination.coordinates[1]) < 0.0001) {
        console.log('Updating balloon data in success handler:', { duration, distance, routeIndex });
        dispatch(updateRouteBalloonData({
          duration,
          distance,
          routeIndex,
        }));
      }
    }

    // Когда все маршруты готовы
    if (completedRef.current === totalDestinations) {
      // Сохраняем результаты в Redux
      dispatch(setRoutes(routeResults as RouteOption[]));
      dispatch(setCalculating(false));

      // Выделяем самый быстрый маршрут
      const fastestIdx = (routeResults as RouteOption[]).reduce(
        (best, _, idx, arr) =>
          arr[idx].duration < arr[best].duration ? idx : best,
        0
      );

      routesRef.current?.forEach((multi, idx) => {
        multi.options.set({
          routeActiveStrokeColor:
            idx === fastestIdx ? ROUTE_COLORS.FASTEST : ROUTE_COLORS.NORMAL,
          routeActiveStrokeWidth: idx === fastestIdx ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
          opacity: idx === fastestIdx ? ROUTE_STYLES.FASTEST_OPACITY : ROUTE_STYLES.NORMAL_OPACITY,
        });
      });

      // Подгоняем границы карты под все маршруты
      setTimeout(() => {
        if (!yandexMapRef.current) return;
        const bounds = yandexMapRef.current.geoObjects.getBounds();
        if (bounds && yandexMapRef.current) {
          yandexMapRef.current.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: MAP_ZOOM_MARGIN,
          });
        }
      }, MAP_BOUNDS_ADJUSTMENT_DELAY);
    }
  };
};

