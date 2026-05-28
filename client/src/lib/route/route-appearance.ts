import type { YandexMultiRoute } from "@/types/yandex-maps";
import { ROUTE_STYLES } from "@/lib/map-constants";
import { toYandexRoutesArray } from "./yandex-route-utils";

export const isDarkMapTheme = (): boolean =>
  document.documentElement.classList.contains("dark");

export interface RouteLineAppearance {
  activeOpacity: number;
  inactiveOpacity: number;
  overlayOpacity: number;
  overlayOutlineWidth: number;
  overlayOutlineColor: string;
  overlayOutlineOpacity: number;
  activeWidthBoost: number;
}

export function getRouteLineAppearance(isDark = isDarkMapTheme()): RouteLineAppearance {
  if (isDark) {
    return {
      activeOpacity: ROUTE_STYLES.DARK.ACTIVE_OPACITY,
      inactiveOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
      overlayOpacity: ROUTE_STYLES.DARK.OVERLAY_OPACITY,
      overlayOutlineWidth: ROUTE_STYLES.DARK.OVERLAY_OUTLINE_WIDTH,
      overlayOutlineColor: ROUTE_STYLES.DARK.OVERLAY_OUTLINE_COLOR,
      overlayOutlineOpacity: ROUTE_STYLES.DARK.OVERLAY_OUTLINE_OPACITY,
      activeWidthBoost: ROUTE_STYLES.DARK.ACTIVE_WIDTH_BOOST,
    };
  }

  return {
    activeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    inactiveOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    overlayOpacity: ROUTE_STYLES.ACTIVE_OVERLAY_OPACITY,
    overlayOutlineWidth: 0,
    overlayOutlineColor: "#ffffff",
    overlayOutlineOpacity: 0,
    activeWidthBoost: 0,
  };
}

export function applyRouteLineAppearance(
  multiRoute: YandexMultiRoute,
  color: string,
  activeStrokeWidth: number,
  isDark = isDarkMapTheme()
) {
  const appearance = getRouteLineAppearance(isDark);
  const activeRoute = multiRoute.getActiveRoute();
  const routes = toYandexRoutesArray(multiRoute.model.getRoutes());
  const inactiveStrokeWidth = Math.max(2, activeStrokeWidth - 2);

  routes.forEach((route) => {
    const isActive = route === activeRoute;
    route.options?.set({
      strokeColor: color,
      strokeWidth: isActive
        ? activeStrokeWidth + appearance.activeWidthBoost
        : inactiveStrokeWidth,
      strokeOpacity: isActive ? appearance.activeOpacity : appearance.inactiveOpacity,
      opacity: isActive ? appearance.activeOpacity : appearance.inactiveOpacity,
    });
  });
}
