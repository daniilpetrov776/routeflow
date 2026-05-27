import { useCallback } from "react";
import { useDispatch, useStore } from "react-redux";
import { setCalculating } from "@/store/route-slice";
import type { RootState } from "@/store";
import { showRouteError } from "@/lib/error-toast";
import type { AddressPoint, TransportMode } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";
import {
  getRouteColor,
  ROUTE_STYLES,
} from "@/lib/map-constants";
import {
  addRouteClickHandler,
  filterValidDestinations,
  validateStartingPoint,
  validateDestination,
  validateRouteCoordinates,
  createMultiRoute,
  getYandexRoutingMode,
  createRouteSuccessHandler,
  createRouteErrorHandler,
} from "@/lib/route";
import { applyRouteLineAppearance } from "@/lib/route/route-appearance";
import type { RouteOption } from "@/store/route-slice";

interface UseRouteCalculationOptions {
  yandexMapRef: React.RefObject<YandexMap | null>;
  routesRef: React.RefObject<YandexMultiRoute[]>;
}

/**
 * Хук для расчета маршрутов на карте Yandex Maps
 */
export function useRouteCalculation({
  yandexMapRef,
  routesRef,
}: UseRouteCalculationOptions) {
  const dispatch = useDispatch();
  const store = useStore<RootState>();

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

    // Валидация начальной точки
    const startingPointError = validateStartingPoint(startingPoint);
    if (startingPointError) {
      console.error(startingPointError);
      showRouteError(startingPointError);
      dispatch(setCalculating(false));
      return;
    }

    // Фильтруем валидные пункты назначения
    const validDestinations = filterValidDestinations(destinations);
    if (validDestinations.length === 0) return;

    dispatch(setCalculating(true));

    // Очищаем старые маршруты
    routesRef.current?.forEach(route => {
      yandexMapRef.current?.geoObjects.remove(route);
    });
    routesRef.current?.splice(0, routesRef.current.length);

    // Подготавливаем массив результатов
    const routeResults: Array<RouteOption | null> = new Array(validDestinations.length).fill(null);
    const completedRef = { current: 0 };
    const routingMode = getYandexRoutingMode(transportMode);

    for (let i = 0; i < validDestinations.length; i++) {
      const destination = validDestinations[i];

      // Валидация пункта назначения
      const destinationError = validateDestination(destination, i);
      if (destinationError) {
        console.error(destinationError);
        showRouteError(destinationError);
        completedRef.current++;
        if (completedRef.current === validDestinations.length) {
          dispatch(setCalculating(false));
        }
        continue;
      }

      // Валидация координат маршрута
      const routeError = validateRouteCoordinates(startingPoint, destination, i);
      if (routeError) {
        console.error(routeError, {
          start: startingPoint.coordinates,
          destination: destination.coordinates,
        });
        showRouteError(routeError);
        completedRef.current++;
        if (completedRef.current === validDestinations.length) {
          dispatch(setCalculating(false));
        }
        continue;
      }

      try {
        // Создаем MultiRoute
        const route = createMultiRoute(
          startingPoint,
          destination,
          transportMode,
          i
        );

        // Добавляем обработчик клика
        if (yandexMapRef.current) {
          addRouteClickHandler(route, i, destination, yandexMapRef.current, dispatch);
        }

        route.events.add("update", () => {
          applyRouteLineAppearance(route, getRouteColor(i), ROUTE_STYLES.NORMAL_STROKE_WIDTH);
        });

        // Добавляем маршрут на карту и в ref
        yandexMapRef.current.geoObjects.add(route);
        routesRef.current?.push(route);

        // Обработка успешного расчёта
        const successHandler = createRouteSuccessHandler(
          route,
          i,
          startingPoint,
          destination,
          routeResults,
          completedRef,
          validDestinations.length,
          routesRef,
          yandexMapRef,
          dispatch,
          store
        );
        route.model.events.add("requestsuccess", successHandler);

        // Обработка ошибок расчёта
        const errorHandler = createRouteErrorHandler(
          i,
          startingPoint,
          destination,
          routingMode,
          transportMode,
          routeResults,
          completedRef,
          validDestinations.length,
          dispatch
        );
        route.model.events.add("requestfail", errorHandler);
      } catch (error) {
        console.error(`Failed to create route #${i + 1}:`, error);
        showRouteError(`Не удалось создать маршрут #${i + 1}`);
        completedRef.current++;
        if (completedRef.current === validDestinations.length) {
          dispatch(setCalculating(false));
        }
      }
    }
  }, [yandexMapRef, routesRef, dispatch]);

  return { calculateRoutes };
}
