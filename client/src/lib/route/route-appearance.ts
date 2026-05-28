import type { YandexMultiRoute } from "@/types/yandex-maps";
import { ROUTE_STYLES } from "@/lib/map-constants";
import { toYandexRoutesArray } from "./yandex-route-utils";

export function applyRouteLineAppearance(
  multiRoute: YandexMultiRoute,
  color: string,
  activeStrokeWidth: number
) {
  const activeRoute = multiRoute.getActiveRoute();
  const routes = toYandexRoutesArray(multiRoute.model.getRoutes());

  routes.forEach((route) => {
    const isActive = route === activeRoute;
    route.options?.set({
      strokeColor: color,
      strokeWidth: isActive ? activeStrokeWidth : Math.max(2, activeStrokeWidth - 2),
      strokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
      opacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    });
  });
}
