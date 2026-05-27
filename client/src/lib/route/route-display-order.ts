import type { RouteOption, RouteSortMode, TransportMode } from "@/store/route-slice";
import { getRecommendedRouteIndex as getRecommendedRouteIndexByScore } from "./route-comparison";

export interface RouteDisplayItem {
  route: RouteOption;
  originalIndex: number;
  colorIndex: number;
  isRecommended: boolean;
}

export function getRecommendedRouteIndex(
  routes: RouteOption[],
  transportMode: TransportMode = "walking"
): number {
  return getRecommendedRouteIndexByScore(routes, transportMode);
}

export function getRouteDisplayItems(
  routes: RouteOption[],
  sortMode: RouteSortMode,
  transportMode: TransportMode = "walking"
): RouteDisplayItem[] {
  const recommendedIndex = getRecommendedRouteIndex(routes, transportMode);

  return routes
    .map((route, originalIndex) => ({ route, originalIndex }))
    .sort((a, b) => {
      if (a.originalIndex === recommendedIndex) return -1;
      if (b.originalIndex === recommendedIndex) return 1;

      const primary =
        sortMode === "time"
          ? a.route.duration - b.route.duration
          : sortMode === "distance"
            ? a.route.distance - b.route.distance
            : sortMode === "traffic"
              ? getTrafficRank(a.route) - getTrafficRank(b.route)
              : (a.route.transferCount ?? 0) - (b.route.transferCount ?? 0);

      return primary || a.route.duration - b.route.duration;
    })
    .map((item) => ({
      ...item,
      colorIndex: item.originalIndex,
      isRecommended: item.originalIndex === recommendedIndex,
    }));
}

function getTrafficRank(route: RouteOption): number {
  switch (route.traffic_info.level) {
    case "light":
      return 0;
    case "moderate":
      return 1;
    case "heavy":
      return 2;
    default:
      return 3;
  }
}
