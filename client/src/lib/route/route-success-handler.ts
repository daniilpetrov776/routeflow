import { setRoutes, setCalculating, updateRouteBalloonData } from "@/store/route-slice";
import type { RootState } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import { showRouteError } from "@/lib/error-toast";
import { extractRouteCoordinates, extractRouteProperties } from "./route-properties";
import { toYandexRoutesArray } from "./yandex-route-utils";
import type { AddressPoint, RouteAlternative, RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute, YandexMap, YandexRoute } from "@/types/yandex-maps";
import {
  getRouteColor,
  ROUTE_STYLES,
  MAP_BOUNDS_ADJUSTMENT_DELAY,
  MAP_ZOOM_MARGIN,
} from "@/lib/map-constants";
import { applyRouteLineAppearance } from "./route-appearance";
import { getRouteDisplayItems } from "./route-display-order";

function yandexRouteToAlternative(route: YandexRoute, id: string): RouteAlternative {
  const { duration, distance, isBlocked, stairsCount, transferCount } = extractRouteProperties(route);
  const coordinates = extractRouteCoordinates(route);
  return {
    id,
    duration,
    distance,
    traffic_info: {
      level: isBlocked ? "heavy" : "light",
    },
    stairsCount,
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
  store?: Store<RootState>
) => {
  return () => {
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
    const alternatives = yandexRoutes.map((yr, i) =>
      yandexRouteToAlternative(yr, `${baseId}-alt-${i}`)
    );
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
      dispatch(setRoutes(routeResults as RouteOption[]));
      dispatch(setCalculating(false));

      const displayItems = getRouteDisplayItems(
        routeResults as RouteOption[],
        store?.getState().route.routeSortMode ?? "time"
      );
      const colorIndexByRouteIndex = new Map(
        displayItems.map((item) => [item.originalIndex, item.colorIndex])
      );

      routesRef.current?.forEach((multi, idx) => {
        const colorIndex = colorIndexByRouteIndex.get(idx) ?? idx;
        const routeColor = getRouteColor(colorIndex);
        const isRecommended = colorIndex === 0;

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
