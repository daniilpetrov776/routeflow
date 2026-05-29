import { ROUTE_STYLES, getRouteColor } from "@/lib/map-constants";
import { applyRouteLineAppearance, type RouteLineAppearance } from "@/lib/route/route-appearance";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";

export interface ApplyMultiRouteStylesParams {
  yandexMap: YandexMap;
  routes: YandexMultiRoute[];
  getRouteColorIndex: (routeIndex: number) => number;
  recommendedRouteIndex: number;
  isDarkMap: boolean;
  routeLineAppearance: RouteLineAppearance;
}

export function applyMultiRouteStylesAndOrder({
  yandexMap,
  routes,
  getRouteColorIndex,
  recommendedRouteIndex,
  isDarkMap,
  routeLineAppearance,
}: ApplyMultiRouteStylesParams): void {
  routes.forEach((multiRouteObj, idx) => {
    const colorIndex = getRouteColorIndex(idx);
    const isRecommended = idx === recommendedRouteIndex;
    const routeColor = getRouteColor(colorIndex);
    const activeStrokeWidth = isRecommended
      ? ROUTE_STYLES.FASTEST_STROKE_WIDTH
      : ROUTE_STYLES.NORMAL_STROKE_WIDTH;
    multiRouteObj.options.set({
      wayPointVisible: false,
      routeActiveStrokeColor: routeColor,
      routeStrokeColor: routeColor,
      routeStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
      routeStrokeOpacity: routeLineAppearance.inactiveOpacity,
      routeActiveStrokeWidth: activeStrokeWidth + routeLineAppearance.activeWidthBoost,
      routeActiveStrokeOpacity: routeLineAppearance.activeOpacity,
      opacity: routeLineAppearance.inactiveOpacity,
    });
    applyRouteLineAppearance(multiRouteObj, routeColor, activeStrokeWidth, isDarkMap);
  });

  routes.forEach((route) => {
    yandexMap.geoObjects.remove(route);
  });
  routes.forEach((route, idx) => {
    if (idx !== recommendedRouteIndex) {
      yandexMap.geoObjects.add(route);
    }
  });
  const recommendedRoute = routes.find((_, idx) => idx === recommendedRouteIndex);
  if (recommendedRoute) {
    yandexMap.geoObjects.add(recommendedRoute);
  }
}
