import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { setRoutes, setCalculating } from "@/store/route-slice";
import { showRouteError } from "@/lib/error-toast";
import {
  ROUTE_COLORS,
  ROUTE_STYLES,
  MAP_BOUNDS_ADJUSTMENT_DELAY,
  MAP_ZOOM_MARGIN,
} from "@/lib/map-constants";
import type { AddressPoint, RouteOption, TransportMode } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";

interface UseRouteCalculationOptions {
  yandexMapRef: React.RefObject<YandexMap | null>;
  routesRef: React.RefObject<YandexMultiRoute[]>;
}

/**
 * Преобразует режим транспорта в формат Yandex Maps
 */
const getYandexRoutingMode = (transportMode: TransportMode): "auto" | "pedestrian" | "bicycle" | "masstransit" => {
  switch (transportMode) {
    case "walking":
      return "pedestrian";
    case "cycling":
      return "bicycle";
    case "transit":
      return "masstransit";
    case "driving":
    default:
      return "auto";
  }
};

/**
 * Хук для расчета маршрутов на карте Yandex Maps
 */
export function useRouteCalculation({
  yandexMapRef,
  routesRef,
}: UseRouteCalculationOptions) {
  const dispatch = useDispatch();

  const calculateRoutes = useCallback(async (
    startingPoint: AddressPoint,
    destinations: AddressPoint[],
    transportMode: TransportMode
  ) => {
    if (!yandexMapRef.current || !startingPoint) return;
    if (!window.ymaps) {
      const errorMessage = "Yandex Maps API не загружен";
      console.error(errorMessage);
      showRouteError(errorMessage);
      dispatch(setCalculating(false));
      return;
    }

    const validDestinations = destinations.filter(
      d => d.address && d.address.trim() !== '' && d.coordinates && d.coordinates.length === 2
    );
    if (validDestinations.length === 0) return;

    // Проверяем координаты начальной точки
    if (!startingPoint.coordinates || startingPoint.coordinates.length !== 2) {
      const errorMessage = "Некорректные координаты начальной точки";
      console.error(errorMessage);
      showRouteError(errorMessage);
      dispatch(setCalculating(false));
      return;
    }

    dispatch(setCalculating(true));

    // Очищаем старые маршруты
    routesRef.current?.forEach(route => {
      yandexMapRef.current?.geoObjects.remove(route);
    });
    routesRef.current?.splice(0, routesRef.current.length);

    // Подготавливаем массив результатов
    const routeResults: Array<RouteOption | null> = new Array(validDestinations.length).fill(null);
    let completed = 0;

    const routingMode = getYandexRoutingMode(transportMode);

    for (let i = 0; i < validDestinations.length; i++) {
      const destination = validDestinations[i];

      // Проверяем координаты пункта назначения
      if (!destination.coordinates || destination.coordinates.length !== 2) {
        const errorMessage = `Некорректные координаты пункта назначения #${i + 1}`;
        console.error(errorMessage);
        showRouteError(errorMessage);
        completed++;
        if (completed === validDestinations.length) {
          dispatch(setCalculating(false));
        }
        continue;
      }

      // Создаем MultiRoute
      const route = new window.ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [
            startingPoint.coordinates,
            destination.coordinates,
          ],
          params: {
            routingMode,
            avoidTrafficJams: true,
          },
        },
        {
          wayPointStartIconColor: ROUTE_COLORS.FASTEST,
          wayPointFinishIconColor: ROUTE_COLORS.FINISH,
          routeActiveStrokeColor: i === 0 ? ROUTE_COLORS.FASTEST : ROUTE_COLORS.NORMAL,
          routeActiveStrokeWidth: i === 0 ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
          opacity: i === 0 ? ROUTE_STYLES.FASTEST_OPACITY : ROUTE_STYLES.NORMAL_OPACITY,
        }
      );

      // Добавляем маршрут на карту и в ref
      yandexMapRef.current.geoObjects.add(route);
      routesRef.current?.push(route);

      // Обработка успешного расчёта
      route.model.events.add("requestsuccess", () => {
        const activeRoute = route.getActiveRoute();
        if (!activeRoute) return;

        // Формируем объект результата
        const durationProp = activeRoute.properties.get("duration");
        const distanceProp = activeRoute.properties.get("distance");
        const blockedProp = activeRoute.properties.get("blocked");
        
        const duration = (typeof durationProp === 'object' && durationProp !== null && 'value' in durationProp)
          ? durationProp.value || 0
          : 0;
        const distance = (typeof distanceProp === 'object' && distanceProp !== null && 'value' in distanceProp)
          ? distanceProp.value || 0
          : 0;
        const isBlocked = typeof blockedProp === 'boolean' ? blockedProp : false;

        const opt: RouteOption = {
          id: `route-${i}`,
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
        routeResults[i] = opt;
        completed++;

        // Когда все маршруты готовы
        if (completed === validDestinations.length) {
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
      });

      // Обработка ошибок расчёта
      route.model.events.add("requestfail", () => {
        const errorMessage = `Не удалось рассчитать маршрут до пункта назначения #${i + 1}`;
        console.error(errorMessage, {
          from: startingPoint.coordinates,
          to: destination.coordinates,
        });
        
        showRouteError(errorMessage);
        
        completed++;
        // Если все маршруты завершились (успешно или с ошибкой)
        if (completed === validDestinations.length) {
          // Сохраняем результаты, даже если некоторые маршруты не удалось рассчитать
          const validResults = routeResults.filter((r): r is RouteOption => r !== null);
          if (validResults.length > 0) {
            dispatch(setRoutes(validResults));
          } else {
            // Если ни один маршрут не был рассчитан, показываем общую ошибку
            showRouteError(
              "Не удалось рассчитать ни один маршрут. Проверьте корректность адресов.",
              true
            );
          }
          dispatch(setCalculating(false));
        }
      });
    }
  }, [yandexMapRef, routesRef, dispatch]);

  return { calculateRoutes };
}

