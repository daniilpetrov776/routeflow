import type { RouteOption, RouteSortMode } from "@/store/route-slice";

export interface RouteDisplayItem {
  route: RouteOption;
  originalIndex: number;
  colorIndex: number;
}

export function getRecommendedRouteIndex(routes: RouteOption[]): number {
  if (routes.length === 0) return -1;

  return routes.reduce(
    (bestIdx, route, idx) =>
      route.duration < routes[bestIdx].duration ? idx : bestIdx,
    0
  );
}

export function getRouteDisplayItems(
  routes: RouteOption[],
  sortMode: RouteSortMode
): RouteDisplayItem[] {
  const recommendedIndex = getRecommendedRouteIndex(routes);

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
    .map((item, colorIndex) => ({ ...item, colorIndex }));
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
