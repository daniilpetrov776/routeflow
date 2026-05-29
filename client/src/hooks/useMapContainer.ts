import { useEffect, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { useMapRouteLayers } from "@/hooks/useMapRouteLayers";
import { useMapBalloonSync } from "@/hooks/useMapBalloonSync";
import { createAllMarkers } from "@/lib/map-markers";
import { clearOverlays } from "@/lib/map-container/route-overlays";
import {
  computeDestinationMarkerStyles,
  getDestinationKey,
  getValidDestinations,
} from "@/lib/map-container/helpers";
import { destroyYandexMap, initYandexMap } from "@/lib/map-container/map-init";
import { closeRouteBalloon } from "@/store/route-slice";
import { getRouteLineAppearance } from "@/lib/route/route-appearance";
import { getRouteDisplayItems } from "@/lib/route/route-display-order";
import { MAP_ANIMATION_DURATION, STARTING_POINT_ZOOM } from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute, YandexPlacemark, YandexPolyline } from "@/types/yandex-maps";

export interface UseMapContainerProps {
  isLoaded: boolean;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  yandexMapRef: React.MutableRefObject<YandexMap | null>;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
}

export function useMapContainer({
  isLoaded,
  startingPoint,
  destinations,
  yandexMapRef,
  routesRef,
}: UseMapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<YandexPlacemark[]>([]);
  const selectedRouteOverlaysRef = useRef<YandexPolyline[]>([]);
  const lastCenteredStartRef = useRef<string | null>(null);
  const dispatch = useDispatch();

  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const { isCalculating, transportMode, routeSortMode, balloon } = useSelector(
    (state: RootState) => state.route
  );
  const actualTheme = useSelector((state: RootState) => state.theme.actualTheme);
  const isDarkMap = actualTheme === "dark";
  const routeLineAppearance = useMemo(() => getRouteLineAppearance(isDarkMap), [isDarkMap]);
  const requestedRouteIndex = useSelector((state: RootState) => state.route.balloon.requestedRouteIndex);

  const { calculateRoutes, clearCalculatedRoutes } = useRouteCalculation({
    yandexMapRef,
    routesRef,
  });

  const validDestinations = useMemo(() => getValidDestinations(destinations), [destinations]);

  const validDestinationsKey = useMemo(
    () => validDestinations.map(getDestinationKey).join("|"),
    [validDestinations]
  );

  const routeDisplayItems = useMemo(
    () => getRouteDisplayItems(calculatedRoutes, routeSortMode, transportMode),
    [calculatedRoutes, routeSortMode, transportMode]
  );

  const routeColorIndexByOriginalIndex = useMemo(
    () => new Map(routeDisplayItems.map((item) => [item.originalIndex, item.colorIndex])),
    [routeDisplayItems]
  );

  const recommendedRouteIndex = useMemo(
    () => routeDisplayItems.find((item) => item.isRecommended)?.originalIndex ?? -1,
    [routeDisplayItems]
  );

  const getRouteColorIndex = useCallback(
    (routeIndex: number) => routeColorIndexByOriginalIndex.get(routeIndex) ?? routeIndex,
    [routeColorIndexByOriginalIndex]
  );

  const destinationMarkerStyles = useMemo(
    () => computeDestinationMarkerStyles(validDestinations, routeDisplayItems),
    [validDestinationsKey, routeDisplayItems]
  );

  useMapRouteLayers({
    yandexMapRef,
    routesRef,
    selectedRouteOverlaysRef,
    calculatedRoutes,
    getRouteColorIndex,
    recommendedRouteIndex,
    isDarkMap,
    routeLineAppearance,
  });

  useMapBalloonSync({
    yandexMapRef,
    routesRef,
    calculatedRoutes,
    startingPoint,
    isCalculating,
    transportMode,
    balloon,
    requestedRouteIndex,
  });

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = () => {
      if (mapRef.current) {
        initYandexMap(mapRef.current, yandexMapRef);
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    }

    return () => {
      destroyYandexMap(yandexMapRef);
    };
  }, [isLoaded, yandexMapRef]);

  useEffect(() => {
    if (!yandexMapRef.current) return;

    if (!startingPoint) {
      clearCalculatedRoutes();
      clearOverlays(yandexMapRef.current, selectedRouteOverlaysRef);
      return;
    }

    if (validDestinations.length === 0) {
      clearOverlays(yandexMapRef.current, selectedRouteOverlaysRef);
    }

    calculateRoutes(startingPoint, validDestinations, transportMode);

    const startKey = startingPoint.coordinates.join(",");
    if (lastCenteredStartRef.current !== startKey) {
      yandexMapRef.current.setCenter(startingPoint.coordinates, STARTING_POINT_ZOOM, {
        duration: MAP_ANIMATION_DURATION,
      });
      lastCenteredStartRef.current = startKey;
    }
  }, [
    startingPoint,
    validDestinationsKey,
    transportMode,
    calculateRoutes,
    clearCalculatedRoutes,
    yandexMapRef,
    validDestinations,
  ]);

  useEffect(() => {
    if (!yandexMapRef.current || !window.ymaps) return;

    markersRef.current.forEach((marker) => {
      yandexMapRef.current?.geoObjects.remove(marker);
    });
    markersRef.current = [];

    if (!startingPoint) return;

    const markers = createAllMarkers(startingPoint, validDestinations, window.ymaps, {
      destinationStyles: destinationMarkerStyles,
    });
    markers.forEach((marker) => {
      yandexMapRef.current?.geoObjects.add(marker);
    });
    markersRef.current = markers;
  }, [startingPoint, validDestinationsKey, destinationMarkerStyles, yandexMapRef, validDestinations]);

  const handleZoomIn = useCallback(() => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() + 1);
    }
  }, [yandexMapRef]);

  const handleZoomOut = useCallback(() => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() - 1);
    }
  }, [yandexMapRef]);

  const handleCenter = useCallback(() => {
    if (yandexMapRef.current && startingPoint) {
      yandexMapRef.current.setCenter(startingPoint.coordinates);
    }
  }, [startingPoint, yandexMapRef]);

  const handleMapClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isRouteBalloon = target.closest('[class*="route-balloon"]') !== null;
      const isYandexMapsElement = target.closest('[class*="ymaps"]') !== null;
      const isRouteLine =
        target.closest('[class*="route"]') !== null || target.closest('[class*="multi"]') !== null;

      if (balloon.data && !isRouteBalloon && !isYandexMapsElement && !isRouteLine) {
        dispatch(closeRouteBalloon());
      }
    },
    [balloon.data, dispatch]
  );

  const closeBalloon = useCallback(() => {
    dispatch(closeRouteBalloon());
  }, [dispatch]);

  return {
    mapRef,
    isCalculating,
    balloon,
    handleZoomIn,
    handleZoomOut,
    handleCenter,
    handleMapClick,
    closeBalloon,
  };
}
