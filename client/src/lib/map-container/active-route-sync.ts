import { ROUTE_STYLES, getRouteColor } from "@/lib/map-constants";
import { applyRouteLineAppearance } from "@/lib/route/route-appearance";
import { toYandexRoutesArray } from "@/lib/route/yandex-route-utils";
import { setSelectedAlternative } from "@/store/route-slice";
import type { RootState } from "@/store";
import type { RouteOption } from "@/store/route-slice";
import type { YandexMultiRoute } from "@/types/yandex-maps";
import type { Store } from "@reduxjs/toolkit";

export interface SyncActiveRoutesFromReduxParams {
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  calculatedRoutes: RouteOption[];
  getRouteColorIndex: (routeIndex: number) => number;
  recommendedRouteIndex: number;
  isDarkMap: boolean;
}

export function syncActiveRoutesFromRedux({
  routesRef,
  calculatedRoutes,
  getRouteColorIndex,
  recommendedRouteIndex,
  isDarkMap,
}: SyncActiveRoutesFromReduxParams): void {
  if (!routesRef.current?.length || calculatedRoutes.length === 0) return;

  calculatedRoutes.forEach((ro, idx) => {
    const multi = routesRef.current![idx];
    if (!multi) return;
    const yaRoutes = toYandexRoutesArray(multi.model.getRoutes());
    const want = ro.selectedAlternativeIndex ?? 0;
    if (want < 0 || want >= yaRoutes.length || !yaRoutes[want]) return;
    const current = multi.getActiveRoute();
    if (current !== yaRoutes[want]) {
      try {
        multi.setActiveRoute(yaRoutes[want]);
      } catch {
        // ignore
      }
    }
    const colorIndex = getRouteColorIndex(idx);
    applyRouteLineAppearance(
      multi,
      getRouteColor(colorIndex),
      idx === recommendedRouteIndex ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
      isDarkMap
    );
  });
}

export interface SubscribeActiveRouteChangesParams {
  multis: YandexMultiRoute[];
  store: Store<RootState>;
  getRouteColorIndex: (routeIndex: number) => number;
  recommendedRouteIndex: number;
  isDarkMap: boolean;
}

export function subscribeActiveRouteChanges({
  multis,
  store,
  getRouteColorIndex,
  recommendedRouteIndex,
  isDarkMap,
}: SubscribeActiveRouteChangesParams): () => void {
  const cleanups: Array<() => void> = [];

  multis.forEach((multi, routeIdx) => {
    const handler = () => {
      const yaRoutes = toYandexRoutesArray(multi.model.getRoutes());
      const active = multi.getActiveRoute();
      const found = active ? yaRoutes.findIndex((r) => r === active) : 0;
      const validIdx = found >= 0 ? found : 0;
      const ro = store.getState().route.routes[routeIdx];
      if (!ro?.alternatives?.length) return;
      if (validIdx >= ro.alternatives.length) return;
      const cur = ro.selectedAlternativeIndex ?? 0;
      if (validIdx !== cur) {
        store.dispatch(setSelectedAlternative({ routeIndex: routeIdx, alternativeIndex: validIdx }));
      }
      const colorIndex = getRouteColorIndex(routeIdx);
      applyRouteLineAppearance(
        multi,
        getRouteColor(colorIndex),
        routeIdx === recommendedRouteIndex ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
        isDarkMap
      );
    };
    multi.events.add("activeroutechange", handler);
    cleanups.push(() => {
      try {
        multi.events.remove("activeroutechange", handler);
      } catch {
        // ignore
      }
    });
  });

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
