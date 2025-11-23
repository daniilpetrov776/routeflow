import type { AddressPoint, TransportMode } from "@/store/route-slice";
import type { RoutingParams, YandexMultiRoute } from "@/types/yandex-maps";
import {
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
export const createRoutingParams = (routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit"): RoutingParams => {
  const params: RoutingParams = {
    routingMode,
  };
  
  // avoidTrafficJams работает только для режима "auto"
  if (routingMode === "auto") {
    params.avoidTrafficJams = true;
  }
  
  return params;
};

/**
 * Создает опции для MultiRoute
 */
export const createMultiRouteOptions = (isFirstRoute: boolean) => {
  return {
    wayPointStartIconColor: ROUTE_COLORS.FASTEST,
    wayPointFinishIconColor: ROUTE_COLORS.FINISH,
    routeActiveStrokeColor: isFirstRoute ? ROUTE_COLORS.FASTEST : ROUTE_COLORS.NORMAL,
    routeActiveStrokeWidth: isFirstRoute ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
    opacity: isFirstRoute ? ROUTE_STYLES.FASTEST_OPACITY : ROUTE_STYLES.NORMAL_OPACITY,
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
  isFirstRoute: boolean
): YandexMultiRoute => {
  if (!window.ymaps) {
    throw new Error("Yandex Maps API не загружен");
  }

  const routingMode = getYandexRoutingMode(transportMode);
  const routeParams = createRoutingParams(routingMode);
  const routeOptions = createMultiRouteOptions(isFirstRoute);

  return new window.ymaps.multiRouter.MultiRoute(
    {
      referencePoints: [
        startingPoint.coordinates,
        destination.coordinates,
      ],
      params: routeParams,
    },
    routeOptions
  );
};

