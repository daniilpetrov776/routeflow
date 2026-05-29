import { useEffect } from "react";
import { useStore } from "react-redux";
import {
  subscribeActiveRouteChanges,
  syncActiveRoutesFromRedux,
} from "@/lib/map-container/active-route-sync";
import { applyMultiRouteStylesAndOrder } from "@/lib/map-container/route-layer-styles";
import { syncSelectedRouteOverlays } from "@/lib/map-container/route-overlays";
import type { RouteLineAppearance } from "@/lib/route/route-appearance";
import type { RootState } from "@/store";
import type { RouteOption } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute, YandexPolyline } from "@/types/yandex-maps";

export interface UseMapRouteLayersParams {
  yandexMapRef: React.MutableRefObject<YandexMap | null>;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  selectedRouteOverlaysRef: React.MutableRefObject<YandexPolyline[]>;
  calculatedRoutes: RouteOption[];
  getRouteColorIndex: (routeIndex: number) => number;
  recommendedRouteIndex: number;
  isDarkMap: boolean;
  routeLineAppearance: RouteLineAppearance;
}

export function useMapRouteLayers({
  yandexMapRef,
  routesRef,
  selectedRouteOverlaysRef,
  calculatedRoutes,
  getRouteColorIndex,
  recommendedRouteIndex,
  isDarkMap,
  routeLineAppearance,
}: UseMapRouteLayersParams): void {
  const store = useStore<RootState>();

  useEffect(() => {
    if (!yandexMapRef.current || !routesRef.current || routesRef.current.length === 0) return;

    applyMultiRouteStylesAndOrder({
      yandexMap: yandexMapRef.current,
      routes: routesRef.current,
      getRouteColorIndex,
      recommendedRouteIndex,
      isDarkMap,
      routeLineAppearance,
    });
  }, [
    calculatedRoutes,
    getRouteColorIndex,
    recommendedRouteIndex,
    yandexMapRef,
    routesRef,
    isDarkMap,
    routeLineAppearance,
  ]);

  useEffect(() => {
    if (!yandexMapRef.current || !window.ymaps) return;

    return syncSelectedRouteOverlays({
      yandexMap: yandexMapRef.current,
      routesRef,
      calculatedRoutes,
      overlaysRef: selectedRouteOverlaysRef,
      getRouteColorIndex,
      recommendedRouteIndex,
      routeLineAppearance,
    });
  }, [
    calculatedRoutes,
    getRouteColorIndex,
    recommendedRouteIndex,
    yandexMapRef,
    routesRef,
    selectedRouteOverlaysRef,
    routeLineAppearance,
  ]);

  useEffect(() => {
    syncActiveRoutesFromRedux({
      routesRef,
      calculatedRoutes,
      getRouteColorIndex,
      recommendedRouteIndex,
      isDarkMap,
    });
  }, [calculatedRoutes, getRouteColorIndex, recommendedRouteIndex, routesRef, isDarkMap]);

  useEffect(() => {
    const multis = routesRef.current;
    if (!multis?.length) return;

    return subscribeActiveRouteChanges({
      multis,
      store,
      getRouteColorIndex,
      recommendedRouteIndex,
      isDarkMap,
    });
  }, [calculatedRoutes, getRouteColorIndex, recommendedRouteIndex, routesRef, store, isDarkMap]);
}
