import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { useMapRouteLayers } from "@/hooks/useMapRouteLayers";
import { useMapBalloonSync } from "@/hooks/useMapBalloonSync";
import { useMapClickPlacement } from "@/hooks/useMapClickPlacement";
import { useMapLongPressPlacement } from "@/hooks/useMapLongPressPlacement";
import { useIsMobile } from "@/hooks/use-mobile";
import { createAllMarkers } from "@/lib/map-markers";
import { clearOverlays } from "@/lib/map-container/route-overlays";
import {
  computeDestinationMarkerStyles,
  getDestinationKey,
  getValidDestinations,
} from "@/lib/map-container/helpers";
import { destroyYandexMap, initYandexMap } from "@/lib/map-container/map-init";
import { fitMapToPoints } from "@/lib/map-container/fit-map-view";
import { closeRouteBalloon } from "@/store/route-slice";
import { getRouteLineAppearance } from "@/lib/route/route-appearance";
import { getRouteDisplayItems } from "@/lib/route/route-display-order";
import {
  MAP_ANIMATION_DURATION,
  MAP_BOUNDS_ADJUSTMENT_DELAY,
  STARTING_POINT_ZOOM,
} from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import type { Coordinates, YandexMap, YandexMultiRoute, YandexPlacemark, YandexPolyline } from "@/types/yandex-maps";

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
  const [mapReady, setMapReady] = useState(false);
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const routeWaypoints = useSelector((state: RootState) => state.route.routeWaypoints);
  const { isCalculating, transportMode, routeSortMode, balloon, mapPlacementMode } = useSelector(
    (state: RootState) => state.route
  );
  const prevPlacementModeRef = useRef(mapPlacementMode);
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

  const routeWaypointsKey = useMemo(
    () =>
      Object.entries(routeWaypoints)
        .map(
          ([key, points]) =>
            `${key}=${points.map((point) => point.coordinates.join(",")).join(">")}`
        )
        .join("|"),
    [routeWaypoints]
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

  useMapClickPlacement(yandexMapRef, mapReady && !isMobile);

  const longPressPlacement = useMapLongPressPlacement(yandexMapRef, mapReady && isMobile);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = () => {
      if (mapRef.current) {
        initYandexMap(mapRef.current, yandexMapRef);
        setMapReady(true);
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    }

    return () => {
      setMapReady(false);
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

    calculateRoutes(startingPoint, validDestinations, transportMode, routeWaypoints);

    // Центрируем только на старт, если нет пунктов назначения.
    // При нескольких точках viewport подгоняется через fitMapToPoints
    // (выход из ручного режима или завершение расчёта маршрутов).
    const startKey = startingPoint.coordinates.join(",");
    if (
      mapPlacementMode === "idle" &&
      validDestinations.length === 0 &&
      lastCenteredStartRef.current !== startKey
    ) {
      yandexMapRef.current.setCenter(startingPoint.coordinates, STARTING_POINT_ZOOM, {
        duration: MAP_ANIMATION_DURATION,
      });
      lastCenteredStartRef.current = startKey;
    }
  }, [
    startingPoint,
    validDestinationsKey,
    transportMode,
    mapPlacementMode,
    routeWaypointsKey,
    routeWaypoints,
    calculateRoutes,
    clearCalculatedRoutes,
    yandexMapRef,
    validDestinations,
  ]);

  useEffect(() => {
    const prevMode = prevPlacementModeRef.current;
    prevPlacementModeRef.current = mapPlacementMode;

    if (prevMode === "idle" || mapPlacementMode !== "idle") {
      return;
    }

    const map = yandexMapRef.current;
    if (!map || !startingPoint) {
      return;
    }

    const routePoints: Coordinates[] = [
      startingPoint.coordinates,
      ...validDestinations.map((destination) => destination.coordinates),
    ];
    fitMapToPoints(map, routePoints, MAP_BOUNDS_ADJUSTMENT_DELAY);
  }, [mapPlacementMode, startingPoint, validDestinations, yandexMapRef]);

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
    const map = yandexMapRef.current;
    if (!map || !startingPoint) {
      return;
    }

    if (validDestinations.length > 0) {
      fitMapToPoints(map, [
        startingPoint.coordinates,
        ...validDestinations.map((destination) => destination.coordinates),
      ]);
      return;
    }

    map.setCenter(startingPoint.coordinates);
  }, [startingPoint, validDestinations.length, yandexMapRef]);

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
    mapPlacementMode,
    isMobile,
    longPressPlacement,
    handleZoomIn,
    handleZoomOut,
    handleCenter,
    handleMapClick,
    closeBalloon,
  };
}
