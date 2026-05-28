import { useEffect, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { createAllMarkers } from "@/lib/map-markers";
import { MapControls } from "./map-controls";
import { MapLoadingState } from "./map-loading-state";
import { MapCalculatingState } from "./map-calculating-state";
import { RouteBalloon } from "./route-balloon";
import { closeRouteBalloon } from "@/store/route-slice";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  STARTING_POINT_ZOOM,
  MAP_ANIMATION_DURATION,
  ROUTE_STYLES,
  getRouteColor,
} from "@/lib/map-constants";
import { applyRouteLineAppearance } from "@/lib/route/route-appearance";
import type { AddressPoint } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";
import styles from "./map-container.module.css";

interface MapContainerProps {
  isLoaded: boolean;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
}

export function MapContainer({
  isLoaded,
  startingPoint,
  destinations
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const yandexMapRef = useRef<YandexMap | null>(null);
  const routesRef = useRef<YandexMultiRoute[]>([]);
  const dispatch = useDispatch();

  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const { isCalculating, transportMode, balloon } = useSelector((state: RootState) => state.route);

  const { calculateRoutes } = useRouteCalculation({
    yandexMapRef,
    routesRef,
  });

  // Индекс самого быстрого маршрута (мемоизирован для оптимизации)
  const fastestIndex = useMemo(() => {
    if (calculatedRoutes.length === 0) return 0;
    return calculatedRoutes.reduce(
      (bestIdx, _, i) =>
        calculatedRoutes[i].duration < calculatedRoutes[bestIdx].duration
          ? i
          : bestIdx,
      0
    );
  }, [calculatedRoutes]);

  // Эффект для обновления стилей уже отрисованных маршрутов
  useEffect(() => {
    if (!yandexMapRef.current) return;

    routesRef.current.forEach((multiRouteObj, idx) => {
      const isFastest = idx === fastestIndex;
      multiRouteObj.options.set({
        wayPointVisible: false,
        routeActiveStrokeColor: getRouteColor(idx),
        routeStrokeColor: getRouteColor(idx),
        routeStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
        routeStrokeOpacity: 1,
        routeActiveStrokeWidth: isFastest ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
        opacity: isFastest ? ROUTE_STYLES.FASTEST_OPACITY : ROUTE_STYLES.NORMAL_OPACITY,
      });
      applyRouteLineAppearance(
        multiRouteObj,
        getRouteColor(idx),
        isFastest ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH
      );
    });
  }, [calculatedRoutes, fastestIndex]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = () => {
      if (window.ymaps && mapRef.current) {
        yandexMapRef.current = new window.ymaps.Map(mapRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          controls: []
        });
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    }

    return () => {
      if (yandexMapRef.current) {
        yandexMapRef.current.destroy();
      }
    };
  }, [isLoaded]);


  useEffect(() => {
    if (!yandexMapRef.current || !startingPoint) return;

    // Очищаем все объекты на карте
    yandexMapRef.current.geoObjects.removeAll();
    routesRef.current = [];

    // Создаем маркеры
    if (!window.ymaps) return;
    const validDestinations = destinations.filter(d => d.address?.trim());
    const markers = createAllMarkers(startingPoint, destinations, window.ymaps);
    markers.forEach(marker => {
      yandexMapRef.current?.geoObjects.add(marker);
    });

    // Запускаем расчёт маршрутов, если есть валидные адреса
    if (validDestinations.length > 0) {
      calculateRoutes(startingPoint, validDestinations, transportMode);
    }

    // Центрируем карту на начальной точке
    yandexMapRef.current.setCenter(startingPoint.coordinates, STARTING_POINT_ZOOM, {
      duration: MAP_ANIMATION_DURATION,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingPoint, destinations, transportMode]);

  // Обработчики контролов карты (мемоизированы для предотвращения лишних ререндеров)
  const handleZoomIn = useCallback(() => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() - 1);
    }
  }, []);

  const handleCenter = useCallback(() => {
    if (yandexMapRef.current && startingPoint) {
      yandexMapRef.current.setCenter(startingPoint.coordinates);
    }
  }, [startingPoint]);

  // Закрываем balloon при клике на карту
  const handleMapClick = useCallback((e: React.MouseEvent) => {
    // Проверяем, что клик был именно на карте, а не на balloon или маршруте
    const target = e.target as HTMLElement;
    const isRouteBalloon = target.closest('[class*="route-balloon"]') !== null;
    const isYandexMapsElement = target.closest('[class*="ymaps"]') !== null;
    const isRouteLine = target.closest('[class*="route"]') !== null || target.closest('[class*="multi"]') !== null;
    
    // Закрываем только если клик был на самой карте, а не на маршруте или balloon
    if (balloon.data && !isRouteBalloon && !isYandexMapsElement && !isRouteLine) {
      console.log('Closing balloon on map click');
      dispatch(closeRouteBalloon());
    }
  }, [balloon.data, dispatch]);

  return (
    <div className={styles["map-container"]} onClick={handleMapClick}>
      <div ref={mapRef} className={styles["map-container__map"]} style={{ minHeight: '100%' }} />

      {!isLoaded && <MapLoadingState />}

      {isCalculating && <MapCalculatingState />}

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
      />

      <RouteBalloon
        data={balloon.data}
        position={balloon.position}
        onClose={() => dispatch(closeRouteBalloon())}
      />
    </div>
  );
}
