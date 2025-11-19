import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { setRoutes, setCalculating } from "@/store/route-slice";
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
      console.error("Yandex Maps API is not loaded");
      return;
    }

    const validDestinations = destinations.filter(
      d => d.address && d.address.trim() !== '' && d.coordinates && d.coordinates.length === 2
    );
    if (validDestinations.length === 0) return;

    // Проверяем координаты начальной точки
    if (!startingPoint.coordinates || startingPoint.coordinates.length !== 2) {
      console.error("Invalid starting point coordinates");
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
        console.error(`Invalid destination coordinates for route #${i}`);
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
                idx === fastestIdx ? "#28a745" : "#007bff",
              routeActiveStrokeWidth: idx === fastestIdx ? 6 : 4,
              opacity: idx === fastestIdx ? 1.0 : 0.7,
            });
          });

          // Подгоняем границы карты под все маршруты
          setTimeout(() => {
            if (!yandexMapRef.current) return;
            const bounds = yandexMapRef.current.geoObjects.getBounds();
            if (bounds && yandexMapRef.current) {
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
        console.error(`Failed to calculate route #${i}`, {
          from: startingPoint.coordinates,
          to: destination.coordinates,
        });
        completed++;
        // Если все маршруты завершились (успешно или с ошибкой)
        if (completed === validDestinations.length) {
          // Сохраняем результаты, даже если некоторые маршруты не удалось рассчитать
          const validResults = routeResults.filter((r): r is RouteOption => r !== null);
          if (validResults.length > 0) {
            dispatch(setRoutes(validResults));
          }
          dispatch(setCalculating(false));
        }
      });
    }
  }, [yandexMapRef, routesRef, dispatch]);

  return { calculateRoutes };
}

