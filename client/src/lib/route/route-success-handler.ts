import { setRoutes, setCalculating, updateRouteBalloonData } from "@/store/route-slice";
import type { RootState } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import { showRouteError } from "@/lib/error-toast";
import { extractDuration, extractRouteCoordinates, extractRouteProperties } from "./route-properties";
import { toYandexRoutesArray } from "./yandex-route-utils";
import type { AddressPoint, RouteAlternative, RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute, YandexMap, YandexRoute } from "@/types/yandex-maps";
import {
  getRouteColor,
  ROUTE_STYLES,
  MAP_BOUNDS_ADJUSTMENT_DELAY,
} from "@/lib/map-constants";
import { fitMapToPoints } from "@/lib/map-container/fit-map-view";
import { applyRouteLineAppearance } from "./route-appearance";
import { getRouteDisplayItems } from "./route-display-order";
import { createMultiRoute } from "./route-creator";

type TrafficLevel = RouteAlternative["traffic_info"]["level"];

const TRAFFIC_BASELINE_TIMEOUT_MS = 6000;

function getTrafficLevel(
  isBlocked: boolean,
  duration: number,
  baselineDuration?: number
): TrafficLevel {
  if (isBlocked) return "heavy";
  if (!baselineDuration || baselineDuration <= 0) return "light";

  const ratio = duration / baselineDuration;
  if (ratio >= 1.4) return "heavy";
  if (ratio >= 1.15) return "moderate";
  return "light";
}

function getMockedStairsCount(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 4;
}

function getBaselineDurationsWithoutTraffic(
  startingPoint: AddressPoint,
  destination: AddressPoint,
  routeIndex: number,
  map: YandexMap | null
): Promise<number[]> {
  if (!map) return Promise.resolve([]);

  return new Promise((resolve) => {
    let baselineRoute: YandexMultiRoute | null = null;
    let settled = false;

    const finish = (durations: number[]) => {
      if (settled) return;
      settled = true;
      if (baselineRoute) {
        map.geoObjects.remove(baselineRoute);
      }
      resolve(durations);
    };

    try {
      baselineRoute = createMultiRoute(
        startingPoint,
        destination,
        "driving",
        routeIndex,
        { avoidTrafficJams: false }
      );
      baselineRoute.options.set({
        opacity: 0,
        routeStrokeOpacity: 0,
        routeActiveStrokeOpacity: 0,
        wayPointVisible: false,
      });
      map.geoObjects.add(baselineRoute);

      baselineRoute.model.events.add("requestsuccess", () => {
        const routes = toYandexRoutesArray(baselineRoute?.model.getRoutes());
        finish(routes.map(extractDuration));
      });
      baselineRoute.model.events.add("requestfail", () => finish([]));
      window.setTimeout(() => finish([]), TRAFFIC_BASELINE_TIMEOUT_MS);
    } catch (error) {
      console.warn("Failed to calculate baseline route without traffic:", error);
      finish([]);
    }
  });
}

function yandexRouteToAlternative(
  route: YandexRoute,
  id: string,
  baselineDuration?: number,
  mockedStairsCount?: number
): RouteAlternative {
  const { duration, distance, isBlocked, stairsCount, transferCount } = extractRouteProperties(route);
  const coordinates = extractRouteCoordinates(route);
  return {
    id,
    duration,
    distance,
    traffic_info: {
      level: getTrafficLevel(isBlocked, duration, baselineDuration),
    },
    stairsCount: mockedStairsCount ?? stairsCount,
    transferCount,
    geometry: coordinates?.length ? { coordinates } : undefined,
  };
}

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
  store?: Store<RootState>,
  onRouteResolved?: (routeOption: RouteOption) => void
) => {
  return async () => {
    const yandexRoutes = toYandexRoutesArray(route.model.getRoutes());
    if (yandexRoutes.length === 0) {
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

    const selectedIdx = 0;

    const baseId = `route-${routeIndex}`;
    const transportMode = store?.getState().route.transportMode ?? "walking";
    const baselineDurations =
      transportMode === "driving"
        ? await getBaselineDurationsWithoutTraffic(
            startingPoint,
            destination,
            routeIndex,
            yandexMapRef.current
          )
        : [];
    const alternatives = yandexRoutes.map((yr, i) => {
      const mockStairsCount =
        transportMode === "walking" || transportMode === "cycling"
          ? getMockedStairsCount(
              [
                startingPoint.coordinates.join(","),
                destination.coordinates.join(","),
                baseId,
                i,
              ].join("|")
            )
          : undefined;

      return yandexRouteToAlternative(
        yr,
        `${baseId}-alt-${i}`,
        baselineDurations[i] ?? baselineDurations[0],
        mockStairsCount
      );
    });
    const selected =
      alternatives[selectedIdx] ?? alternatives[0];

    const opt: RouteOption = {
      id: baseId,
      destination,
      duration: selected.duration,
      distance: selected.distance,
      traffic_info: { ...selected.traffic_info },
      stairsCount: selected.stairsCount ?? 0,
      transferCount: selected.transferCount ?? 0,
      geometry: selected.geometry,
      alternatives,
      selectedAlternativeIndex: selectedIdx,
    };

    routeResults[routeIndex] = opt;
    onRouteResolved?.(opt);
    completedRef.current++;

    if (store) {
      const state = store.getState();
      const balloonData = state.route.balloon.data;
      if (
        balloonData &&
        balloonData.destination.address === destination.address &&
        Math.abs(balloonData.destination.coordinates[0] - destination.coordinates[0]) < 0.0001 &&
        Math.abs(balloonData.destination.coordinates[1] - destination.coordinates[1]) < 0.0001
      ) {
        dispatch(
          updateRouteBalloonData({
            duration: selected.duration,
            distance: selected.distance,
            routeIndex,
            alternativeIndex: selectedIdx,
          })
        );
      }
    }

    if (completedRef.current === totalDestinations) {
      const completedRoutes = routeResults.filter((r): r is RouteOption => r !== null);
      dispatch(setRoutes(completedRoutes));
      dispatch(setCalculating(false));

      const displayItems = getRouteDisplayItems(
        completedRoutes,
        store?.getState().route.routeSortMode ?? "time",
        transportMode
      );
      const colorIndexByRouteIndex = new Map(
        displayItems.map((item) => [item.originalIndex, item.colorIndex])
      );
      const recommendedRouteIndex =
        displayItems.find((item) => item.isRecommended)?.originalIndex ?? -1;

      routesRef.current?.forEach((multi, idx) => {
        const colorIndex = colorIndexByRouteIndex.get(idx) ?? idx;
        const routeColor = getRouteColor(colorIndex);
        const isRecommended = idx === recommendedRouteIndex;

        multi.options.set({
          wayPointVisible: false,
          routeActiveStrokeColor: routeColor,
          routeStrokeColor: routeColor,
          routeStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
          routeStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
          routeActiveStrokeWidth:
            isRecommended ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
          routeActiveStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
          opacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
        });
        applyRouteLineAppearance(
          multi,
          routeColor,
          isRecommended ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH
        );
      });

      if (yandexMapRef.current && store?.getState().route.mapPlacementMode === "idle") {
        const routePoints = [
          startingPoint.coordinates,
          ...completedRoutes.map((route) => route.destination.coordinates),
        ];
        fitMapToPoints(yandexMapRef.current, routePoints, MAP_BOUNDS_ADJUSTMENT_DELAY);
      }
    }
  };
};
