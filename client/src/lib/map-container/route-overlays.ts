import { ROUTE_STYLES, getRouteColor } from "@/lib/map-constants";
import { extractRouteCoordinates } from "@/lib/route/route-properties";
import { type RouteLineAppearance } from "@/lib/route/route-appearance";
import { toYandexRoutesArray } from "@/lib/route/yandex-route-utils";
import type { RouteOption } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute, YandexPolyline } from "@/types/yandex-maps";

export function clearOverlays(
  yandexMap: YandexMap | null,
  overlaysRef: React.MutableRefObject<YandexPolyline[]>
): void {
  overlaysRef.current.forEach((overlay) => {
    yandexMap?.geoObjects.remove(overlay);
  });
  overlaysRef.current = [];
}

export interface SyncSelectedRouteOverlaysParams {
  yandexMap: YandexMap;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  calculatedRoutes: RouteOption[];
  overlaysRef: React.MutableRefObject<YandexPolyline[]>;
  getRouteColorIndex: (routeIndex: number) => number;
  recommendedRouteIndex: number;
  routeLineAppearance: RouteLineAppearance;
}

export function syncSelectedRouteOverlays({
  yandexMap,
  routesRef,
  calculatedRoutes,
  overlaysRef,
  getRouteColorIndex,
  recommendedRouteIndex,
  routeLineAppearance,
}: SyncSelectedRouteOverlaysParams): () => void {
  clearOverlays(yandexMap, overlaysRef);

  const ymaps = window.ymaps;
  if (!ymaps) {
    return () => clearOverlays(yandexMap, overlaysRef);
  }

  calculatedRoutes.forEach((routeOption, routeIndex) => {
    const multiRoute = routesRef.current?.[routeIndex];
    const yandexRoutes = multiRoute ? toYandexRoutesArray(multiRoute.model.getRoutes()) : [];
    const selectedAlternativeIndex = routeOption.selectedAlternativeIndex ?? 0;

    yandexRoutes.forEach((yandexRoute, alternativeIndex) => {
      if (alternativeIndex !== selectedAlternativeIndex) {
        return;
      }

      const fallbackAlternative =
        routeOption.alternatives[alternativeIndex] ?? routeOption.alternatives[0];

      let coordinates = extractRouteCoordinates(yandexRoute);

      if (
        !coordinates &&
        fallbackAlternative?.geometry?.coordinates &&
        fallbackAlternative.geometry.coordinates.length > 2
      ) {
        coordinates = fallbackAlternative.geometry.coordinates;
      }

      if (!coordinates || coordinates.length < 2) return;

      const colorIndex = getRouteColorIndex(routeIndex);
      const isRecommended = routeIndex === recommendedRouteIndex;
      const color = getRouteColor(colorIndex);
      const width = isRecommended
        ? ROUTE_STYLES.FASTEST_STROKE_WIDTH
        : ROUTE_STYLES.NORMAL_STROKE_WIDTH;
      const overlayWidth = width + routeLineAppearance.activeWidthBoost;
      const overlayZIndex = 1000 + colorIndex;
      const shouldDrawOutline = routeLineAppearance.overlayOutlineWidth > 0;

      if (shouldDrawOutline) {
        const outline = new ymaps.Polyline(
          coordinates,
          {},
          {
            strokeColor: routeLineAppearance.overlayOutlineColor,
            strokeWidth: overlayWidth + routeLineAppearance.overlayOutlineWidth * 2,
            strokeOpacity: routeLineAppearance.overlayOutlineOpacity,
            opacity: routeLineAppearance.overlayOutlineOpacity,
            zIndex: overlayZIndex,
          }
        );
        yandexMap.geoObjects.add(outline);
        overlaysRef.current.push(outline);
      }

      const overlay = new ymaps.Polyline(
        coordinates,
        {},
        {
          strokeColor: color,
          strokeWidth: overlayWidth,
          strokeOpacity: routeLineAppearance.overlayOpacity,
          opacity: routeLineAppearance.overlayOpacity,
          zIndex: overlayZIndex + 1,
        }
      );

      yandexMap.geoObjects.add(overlay);
      overlaysRef.current.push(overlay);
    });
  });

  return () => clearOverlays(yandexMap, overlaysRef);
}
