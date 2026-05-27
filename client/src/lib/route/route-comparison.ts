import type { RouteAlternative, RouteOption, TransportMode } from "@/store/route-slice";
import { formatDistance, formatDuration } from "./route-utils";

const TRAFFIC_WEIGHT: Record<RouteOption["traffic_info"]["level"], number> = {
  light: 0,
  moderate: 0.55,
  heavy: 1,
};

interface NormalizedMetrics {
  duration: number;
  distance: number;
  traffic: number;
  transfers: number;
  stairs: number;
}

export interface RouteComparison {
  score: number;
  reason: string;
}

const normalize = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return 1;
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
};

const getMetricRanges = (routes: RouteOption[]) => {
  const values = routes.map((route) => ({
    duration: route.duration,
    distance: route.distance,
    traffic: TRAFFIC_WEIGHT[route.traffic_info.level] ?? 1,
    transfers: route.transferCount ?? 0,
    stairs: route.stairsCount ?? 0,
  }));

  const range = (key: keyof NormalizedMetrics): [number, number] => [
    Math.min(...values.map((value) => value[key])),
    Math.max(...values.map((value) => value[key])),
  ];

  return {
    duration: range("duration"),
    distance: range("distance"),
    traffic: range("traffic"),
    transfers: range("transfers"),
    stairs: range("stairs"),
  };
};

const getNormalizedMetrics = (
  route: RouteOption,
  ranges: ReturnType<typeof getMetricRanges>
): NormalizedMetrics => ({
  duration: normalize(route.duration, ...ranges.duration),
  distance: normalize(route.distance, ...ranges.distance),
  traffic: normalize(TRAFFIC_WEIGHT[route.traffic_info.level] ?? 1, ...ranges.traffic),
  transfers: normalize(route.transferCount ?? 0, ...ranges.transfers),
  stairs: normalize(route.stairsCount ?? 0, ...ranges.stairs),
});

const getModePenalty = (metrics: NormalizedMetrics, transportMode: TransportMode): number => {
  switch (transportMode) {
    case "driving":
      return metrics.duration * 0.55 + metrics.distance * 0.25 + metrics.traffic * 0.2;
    case "transit":
      return metrics.duration * 0.55 + metrics.distance * 0.15 + metrics.transfers * 0.3;
    case "walking":
    case "cycling":
      return metrics.duration * 0.5 + metrics.distance * 0.35 + metrics.stairs * 0.15;
    default:
      return metrics.duration * 0.65 + metrics.distance * 0.35;
  }
};

export function getRouteScore(
  route: RouteOption,
  routes: RouteOption[],
  transportMode: TransportMode
): number {
  if (routes.length <= 1) return 100;

  const ranges = getMetricRanges(routes);
  const metrics = getNormalizedMetrics(route, ranges);
  const penalty = getModePenalty(metrics, transportMode);

  return Math.round(Math.max(0, Math.min(100, 100 - penalty * 45)));
}

export function getRecommendedRouteIndex(
  routes: RouteOption[],
  transportMode: TransportMode
): number {
  if (routes.length === 0) return -1;

  return routes.reduce((bestIdx, route, idx) => {
    const score = getRouteScore(route, routes, transportMode);
    const bestScore = getRouteScore(routes[bestIdx], routes, transportMode);
    if (score !== bestScore) return score > bestScore ? idx : bestIdx;
    if (route.duration !== routes[bestIdx].duration) {
      return route.duration < routes[bestIdx].duration ? idx : bestIdx;
    }
    return route.distance < routes[bestIdx].distance ? idx : bestIdx;
  }, 0);
}

export function getRouteComparison(
  route: RouteOption,
  routes: RouteOption[],
  transportMode: TransportMode
): RouteComparison {
  const score = getRouteScore(route, routes, transportMode);
  const fastest = Math.min(...routes.map((item) => item.duration));
  const shortest = Math.min(...routes.map((item) => item.distance));
  const minTransfers = Math.min(...routes.map((item) => item.transferCount ?? 0));
  const minStairs = Math.min(...routes.map((item) => item.stairsCount ?? 0));

  if (route.duration === fastest && route.distance === shortest) {
    return { score, reason: "лучшее время и расстояние" };
  }
  if (route.duration === fastest) {
    return { score, reason: "самое быстрое время" };
  }
  if (transportMode === "driving" && route.traffic_info.level === "light") {
    return { score, reason: "свободные пробки при хорошем времени" };
  }
  if (transportMode === "transit" && (route.transferCount ?? 0) === minTransfers) {
    return { score, reason: "меньше пересадок при близком времени" };
  }
  if ((transportMode === "walking" || transportMode === "cycling") && (route.stairsCount ?? 0) === minStairs) {
    return { score, reason: "меньше лестниц при близком времени" };
  }
  if (route.distance === shortest) {
    return { score, reason: "самое короткое расстояние" };
  }

  return { score, reason: "сбалансирован по времени и расстоянию" };
}

const formatSignedDuration = (seconds: number): string => {
  if (seconds === 0) return "то же время";
  return `${seconds > 0 ? "+" : "-"}${formatDuration(Math.abs(seconds))}`;
};

const formatSignedDistance = (meters: number): string => {
  if (meters === 0) return "то же расстояние";
  return `${meters > 0 ? "+" : "-"}${formatDistance(Math.abs(meters))}`;
};

export function getAlternativeSummary(
  alternative: RouteAlternative,
  baseAlternative: RouteAlternative,
  transportMode: TransportMode
): string {
  const details = [
    formatSignedDuration(alternative.duration - baseAlternative.duration),
    formatSignedDistance(alternative.distance - baseAlternative.distance),
  ];

  if (transportMode === "transit") {
    const transferDelta = (alternative.transferCount ?? 0) - (baseAlternative.transferCount ?? 0);
    if (transferDelta !== 0) {
      details.push(`${transferDelta > 0 ? "+" : ""}${transferDelta} перес.`);
    }
  }

  if (transportMode === "walking" || transportMode === "cycling") {
    const stairsDelta = (alternative.stairsCount ?? 0) - (baseAlternative.stairsCount ?? 0);
    if (stairsDelta !== 0) {
      details.push(`${stairsDelta > 0 ? "+" : ""}${stairsDelta} лестн.`);
    }
  }

  return details.join(" · ");
}
