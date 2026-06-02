import type { AddressPoint, TransportMode } from "@/store/route-slice";
import type { RoutingParams, YandexMultiRoute } from "@/types/yandex-maps";
import {
  getRouteColor,
  ROUTE_COLORS,
  ROUTE_STYLES,
} from "@/lib/map-constants";

/**
 * Преобразует режим транспорта в формат Yandex Maps
 */
export const getYandexRoutingMode = (
  transportMode: TransportMode
): "auto" | "pedestrian" | "bicycle" | "masstransit" => {
  switch (transportMode) {
    case "walking":
      return "pedestrian";
    case "cycling":
      return "bicycle";
    case "transit":
      return "masstransit";
    case "driving":
    default:
      return "auto";
  }
};

/**
 * Создает параметры маршрутизации
 */
export const createRoutingParams = (
  routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit",
  avoidTrafficJams = routingMode === "auto"
): RoutingParams => {
  const params: RoutingParams = {
    routingMode,
  };
  
  // avoidTrafficJams работает только для режима "auto"
  if (routingMode === "auto") {
    params.avoidTrafficJams = avoidTrafficJams;
  }
  
  return params;
};

/**
 * Создает опции для MultiRoute
 */
export const createMultiRouteOptions = (routeIndex: number) => {
  const routeColor = getRouteColor(routeIndex);

  return {
    wayPointVisible: false,
    wayPointStartIconColor: routeColor,
    wayPointFinishIconColor: ROUTE_COLORS.FINISH,
    routeActiveStrokeColor: routeColor,
    routeStrokeColor: routeColor,
    routeStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
    routeStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    routeActiveStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
    routeActiveStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    opacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
    // Отключаем стандартный balloon
    balloonContentLayout: '',
    balloonContentBodyLayout: '',
    balloonContentItemLayout: '',
    // Отключаем открытие balloon по клику (будем обрабатывать сами)
    balloonAutoPan: false,
  };
};

/**
 * Создает MultiRoute для Yandex Maps
 */
export const createMultiRoute = (
  startingPoint: AddressPoint,
  destination: AddressPoint,
  transportMode: TransportMode,
  routeIndex: number,
  options?: { avoidTrafficJams?: boolean; via?: AddressPoint[] }
): YandexMultiRoute => {
  if (!window.ymaps) {
    throw new Error("Yandex Maps API не загружен");
  }

  const routingMode = getYandexRoutingMode(transportMode);
  const routeParams = createRoutingParams(routingMode, options?.avoidTrafficJams);
  const routeOptions = createMultiRouteOptions(routeIndex);

  const viaPoints = (options?.via ?? []).map((waypoint) => waypoint.coordinates);

  return new window.ymaps.multiRouter.MultiRoute(
    {
      referencePoints: [
        startingPoint.coordinates,
        ...viaPoints,
        destination.coordinates,
      ],
      params: routeParams,
    },
    routeOptions
  );
};

