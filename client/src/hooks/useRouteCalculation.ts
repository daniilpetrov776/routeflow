import { useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { setRoutes, setCalculating } from "@/store/route-slice";
import type { AddressPoint, RouteOption, TransportMode } from "@/store/route-slice";

interface UseRouteCalculationOptions {
  yandexMapRef: React.RefObject<any>;
  routesRef: React.RefObject<any[]>;
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

    const validDestinations = destinations.filter(
      d => d.address && d.address.trim() !== ''
    );
    if (validDestinations.length === 0) return;

    dispatch(setCalculating(true));

    // Очищаем старые маршруты
    routesRef.current?.forEach(route => {
      yandexMapRef.current.geoObjects.remove(route);
    });
    if (routesRef.current) {
      routesRef.current = [];
    }

    // Подготавливаем массив результатов
    const routeResults: Array<RouteOption | null> = new Array(validDestinations.length).fill(null);
    let completed = 0;

    const routingMode = getYandexRoutingMode(transportMode);

    for (let i = 0; i < validDestinations.length; i++) {
      const destination = validDestinations[i];

      // Создаем MultiRoute
      // @ts-ignore
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
          wayPointStartIconColor: "#28a745",
          wayPointFinishIconColor: "#dc3545",
          routeActiveStrokeColor: i === 0 ? "#28a745" : "#007bff",
          routeActiveStrokeWidth: i === 0 ? 6 : 4,
          opacity: i === 0 ? 1.0 : 0.7,
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
        const opt: RouteOption = {
          id: `route-${i}`,
          destination,
          duration: activeRoute.properties.get("duration")?.value || 0,
          distance: activeRoute.properties.get("distance")?.value || 0,
          traffic_info: {
            level: activeRoute.properties.get("blocked") ? "heavy" : "light",
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
                idx === fastestIdx ? "#28a745" : "#007bff",
              routeActiveStrokeWidth: idx === fastestIdx ? 6 : 4,
              opacity: idx === fastestIdx ? 1.0 : 0.7,
            });
          });

          // Подгоняем границы карты под все маршруты
          setTimeout(() => {
            const bounds = yandexMapRef.current.geoObjects.getBounds();
            if (bounds) {
              yandexMapRef.current.setBounds(bounds, {
                checkZoomRange: true,
                zoomMargin: 50,
              });
            }
          }, 1000);
        }
      });

      // Обработка ошибок расчёта
      route.model.events.add("requestfail", () => {
        console.error(`Failed to calculate route #${i}`);
        if (completed + 1 === validDestinations.length) {
          dispatch(setCalculating(false));
        }
      });
    }
  }, [yandexMapRef, routesRef, dispatch]);

  return { calculateRoutes };
}

