import { useCallback, useRef } from "react";
import { useDispatch, useStore } from "react-redux";
import { getWaypointKey, setCalculating, setRoutes } from "@/store/route-slice";
import type { RootState } from "@/store";
import { showRouteError } from "@/lib/error-toast";
import type {
  AddressPoint,
  RouteOption,
  RouteWaypointsMap,
  TransportMode,
} from "@/store/route-slice";
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

interface UseRouteCalculationOptions {
  yandexMapRef: React.RefObject<YandexMap | null>;
  routesRef: React.RefObject<YandexMultiRoute[]>;
}

interface RouteRecord {
  route: YandexMultiRoute;
  option: RouteOption | null;
  added: boolean;
}

const coordinateKey = (point: AddressPoint): string =>
  point.coordinates.map((coordinate) => coordinate.toFixed(6)).join(",");

const viaKey = (via: AddressPoint[]): string =>
  via.map((point) => coordinateKey(point)).join(">");

const getRouteCacheKey = (
  startingPoint: AddressPoint,
  destination: AddressPoint,
  transportMode: TransportMode,
  routeIndex: number,
  via: AddressPoint[] = []
): string => {
  return [
    routeIndex,
    transportMode,
    coordinateKey(startingPoint),
    coordinateKey(destination),
    viaKey(via),
  ].join("|");
};

const cloneRouteOption = (
  option: RouteOption,
  routeIndex: number,
  destination: AddressPoint
): RouteOption => {
  const alternatives = option.alternatives.map((alternative, alternativeIndex) => ({
    ...alternative,
    id: `route-${routeIndex}-alt-${alternativeIndex}`,
    traffic_info: { ...alternative.traffic_info },
    geometry: alternative.geometry
      ? { coordinates: [...alternative.geometry.coordinates] }
      : undefined,
  }));
  const selectedAlternativeIndex = Math.max(
    0,
    Math.min(option.selectedAlternativeIndex ?? 0, alternatives.length - 1)
  );
  const selected = alternatives[selectedAlternativeIndex] ?? alternatives[0];

  return {
    ...option,
    id: `route-${routeIndex}`,
    destination,
    duration: selected?.duration ?? option.duration,
    distance: selected?.distance ?? option.distance,
    traffic_info: selected ? { ...selected.traffic_info } : { ...option.traffic_info },
    stairsCount: selected?.stairsCount ?? option.stairsCount ?? 0,
    transferCount: selected?.transferCount ?? option.transferCount ?? 0,
    geometry: selected?.geometry
      ? { coordinates: [...selected.geometry.coordinates] }
      : option.geometry
        ? { coordinates: [...option.geometry.coordinates] }
        : undefined,
    alternatives,
    selectedAlternativeIndex,
  };
};

/**
 * Хук для расчета маршрутов на карте Yandex Maps.
 * Сохраняет уже построенные MultiRoute в памяти и не пересчитывает их,
 * если старт, финиш, транспорт и позиция пункта в списке не изменились.
 */
export function useRouteCalculation({
  yandexMapRef,
  routesRef,
}: UseRouteCalculationOptions) {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const routeRecordsRef = useRef<Map<string, RouteRecord>>(new Map());

  const clearCalculatedRoutes = useCallback(() => {
    const map = yandexMapRef.current;
    routeRecordsRef.current.forEach((record) => {
      map?.geoObjects.remove(record.route);
    });
    routeRecordsRef.current.clear();
    routesRef.current?.splice(0, routesRef.current.length);
    dispatch(setRoutes([]));
    dispatch(setCalculating(false));
  }, [yandexMapRef, routesRef, dispatch]);

  const calculateRoutes = useCallback(async (
    startingPoint: AddressPoint,
    destinations: AddressPoint[],
    transportMode: TransportMode,
    routeWaypoints: RouteWaypointsMap = {}
  ) => {
    const map = yandexMapRef.current;
    if (!map || !startingPoint) return;

    const getViaForDestination = (destination: AddressPoint): AddressPoint[] =>
      routeWaypoints[getWaypointKey(destination)] ?? [];
    
    if (!window.ymaps) {
      const errorMessage = "Yandex Maps API не загружен";
      console.error(errorMessage);
      showRouteError(errorMessage);
      dispatch(setCalculating(false));
      return;
    }

    const startingPointError = validateStartingPoint(startingPoint);
    if (startingPointError) {
      console.error(startingPointError);
      showRouteError(startingPointError);
      dispatch(setCalculating(false));
      return;
    }

    const validDestinations = filterValidDestinations(destinations);
    if (validDestinations.length === 0) {
      routesRef.current?.forEach((route) => map.geoObjects.remove(route));
      routesRef.current?.splice(0, routesRef.current.length);
      routeRecordsRef.current.clear();
      dispatch(setRoutes([]));
      dispatch(setCalculating(false));
      return;
    }

    const activeKeys = new Set(
      validDestinations.map((destination, index) =>
        getRouteCacheKey(
          startingPoint,
          destination,
          transportMode,
          index,
          getViaForDestination(destination)
        )
      )
    );

    routeRecordsRef.current.forEach((record, key) => {
      if (!activeKeys.has(key)) {
        map.geoObjects.remove(record.route);
        routeRecordsRef.current.delete(key);
      }
    });

    const routeResults: Array<RouteOption | null> = new Array(validDestinations.length).fill(null);
    const nextRoutes: YandexMultiRoute[] = [];
    const completedRef = { current: 0 };
    const routingMode = getYandexRoutingMode(transportMode);
    let pendingRoutes = 0;

    for (let i = 0; i < validDestinations.length; i++) {
      const destination = validDestinations[i];
      const via = getViaForDestination(destination);
      const cacheKey = getRouteCacheKey(startingPoint, destination, transportMode, i, via);

      const destinationError = validateDestination(destination, i);
      if (destinationError) {
        console.error(destinationError);
        showRouteError(destinationError);
        completedRef.current++;
        continue;
      }

      const routeError = validateRouteCoordinates(startingPoint, destination, i);
      if (routeError) {
        console.error(routeError, {
          start: startingPoint.coordinates,
          destination: destination.coordinates,
        });
        showRouteError(routeError);
        completedRef.current++;
        continue;
      }

      const cachedRecord = routeRecordsRef.current.get(cacheKey);
      if (cachedRecord?.option) {
        routeResults[i] = cloneRouteOption(cachedRecord.option, i, destination);
        nextRoutes[i] = cachedRecord.route;
        if (!cachedRecord.added) {
          map.geoObjects.add(cachedRecord.route);
          cachedRecord.added = true;
        }
        completedRef.current++;
        continue;
      }

      if (cachedRecord && !cachedRecord.option) {
        map.geoObjects.remove(cachedRecord.route);
        routeRecordsRef.current.delete(cacheKey);
      }

      try {
        const route = createMultiRoute(
          startingPoint,
          destination,
          transportMode,
          i,
          { via }
        );

        addRouteClickHandler(route, i, destination, map, dispatch);

        route.events.add("update", () => {
          applyRouteLineAppearance(route, getRouteColor(i), ROUTE_STYLES.NORMAL_STROKE_WIDTH);
        });

        map.geoObjects.add(route);
        nextRoutes[i] = route;
        routeRecordsRef.current.set(cacheKey, {
          route,
          option: null,
          added: true,
        });
        pendingRoutes++;

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
          store,
          (routeOption) => {
            const record = routeRecordsRef.current.get(cacheKey);
            if (record?.route === route) {
              record.option = cloneRouteOption(routeOption, i, destination);
            }
          },
          via
        );
        route.model.events.add("requestsuccess", successHandler);

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
      }
    }

    routesRef.current?.splice(0, routesRef.current.length, ...nextRoutes.filter(Boolean));

    if (pendingRoutes === 0) {
      const validResults = routeResults.filter((route): route is RouteOption => route !== null);
      dispatch(setRoutes(validResults));
      dispatch(setCalculating(false));
      return;
    }

    dispatch(setCalculating(true));
  }, [yandexMapRef, routesRef, dispatch, store]);

  return { calculateRoutes, clearCalculatedRoutes };
}
