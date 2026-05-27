import { useEffect, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { RootState } from "@/store";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { createAllMarkers } from "@/lib/map-markers";
import { MapControls } from "./map-controls";
import { MapLoadingState } from "./map-loading-state";
import { MapCalculatingState } from "./map-calculating-state";
import { RouteBalloon } from "../route/route-balloon";
import {
  closeRouteBalloon,
  openRouteBalloon,
  updateRouteBalloonPosition,
  updateRouteBalloonData,
  clearRequestedRouteIndex,
  setSelectedAlternative,
} from "@/store/route-slice";
import { toYandexRoutesArray } from "@/lib/route/yandex-route-utils";
import { recalculateBalloonPosition } from "@/lib/route/route-balloon-position";
import { applyRouteLineAppearance } from "@/lib/route/route-appearance";
import { getRouteDisplayItems } from "@/lib/route/route-display-order";
import { extractRouteCoordinates } from "@/lib/route/route-properties";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  STARTING_POINT_ZOOM,
  MAP_ANIMATION_DURATION,
  ROUTE_STYLES,
  getRouteColor,
} from "@/lib/map-constants";
import type { AddressPoint, TransportMode } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute, YandexPlacemark, YandexPolyline } from "@/types/yandex-maps";
import styles from "./map-container.module.css";

interface MapContainerProps {
  isLoaded: boolean;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  yandexMapRef: React.MutableRefObject<YandexMap | null>;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
}

const getDestinationKey = (destination: AddressPoint): string =>
  `${destination.address.trim()}@${destination.coordinates[0].toFixed(6)},${destination.coordinates[1].toFixed(6)}`;

export function MapContainer({
  isLoaded,
  startingPoint,
  destinations,
  yandexMapRef,
  routesRef,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<YandexPlacemark[]>([]);
  const selectedRouteOverlaysRef = useRef<YandexPolyline[]>([]);
  const lastCenteredStartRef = useRef<string | null>(null);
  const dispatch = useDispatch();
  const store = useStore<RootState>();

  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const { isCalculating, transportMode, routeSortMode, balloon } = useSelector((state: RootState) => state.route);
  const requestedRouteIndex = useSelector((state: RootState) => state.route.balloon.requestedRouteIndex);
  
  // Отслеживаем последние значения для предотвращения лишних пересчетов
  const lastBalloonDataRef = useRef<typeof balloon.data | null>(null);
  const lastTransportModeRef = useRef<TransportMode>(transportMode);
  
  // Сбрасываем ref при закрытии balloon
  useEffect(() => {
    if (!balloon.data) {
      lastBalloonDataRef.current = null;
    }
  }, [balloon.data]);

  const { calculateRoutes } = useRouteCalculation({
    yandexMapRef,
    routesRef,
  });

  const validDestinations = useMemo(
    () => destinations.filter((destination) => destination.address?.trim()),
    [destinations]
  );

  const validDestinationsKey = useMemo(
    () => validDestinations.map(getDestinationKey).join("|"),
    [validDestinations]
  );

  const routeDisplayItems = useMemo(
    () => getRouteDisplayItems(calculatedRoutes, routeSortMode),
    [calculatedRoutes, routeSortMode]
  );

  const routeColorIndexByOriginalIndex = useMemo(() => {
    return new Map(
      routeDisplayItems.map((item) => [item.originalIndex, item.colorIndex])
    );
  }, [routeDisplayItems]);

  const getRouteColorIndex = useCallback(
    (routeIndex: number) => routeColorIndexByOriginalIndex.get(routeIndex) ?? routeIndex,
    [routeColorIndexByOriginalIndex]
  );

  const destinationMarkerStyles = useMemo(() => {
    return validDestinations.map((destination, destinationIndex) => {
      const routeDisplayItem = routeDisplayItems.find(({ route }) => {
        const routeDest = route.destination;
        return (
          routeDest.address === destination.address &&
          Math.abs(routeDest.coordinates[0] - destination.coordinates[0]) < 0.0001 &&
          Math.abs(routeDest.coordinates[1] - destination.coordinates[1]) < 0.0001
        );
      });
      const colorIndex = routeDisplayItem?.colorIndex ?? destinationIndex;

      return {
        label: routeDisplayItem ? routeDisplayItem.colorIndex + 1 : destinationIndex + 1,
        color: getRouteColor(colorIndex),
      };
    });
  }, [validDestinationsKey, routeDisplayItems]);

  // Эффект для обновления стилей уже отрисованных маршрутов и порядка отображения
  useEffect(() => {
    if (!yandexMapRef.current || !routesRef.current || routesRef.current.length === 0) return;

    // Сначала обновляем стили всех маршрутов
    routesRef.current.forEach((multiRouteObj, idx) => {
      const colorIndex = getRouteColorIndex(idx);
      const isRecommended = colorIndex === 0;
      const routeColor = getRouteColor(colorIndex);
      multiRouteObj.options.set({
        wayPointVisible: false,
        routeActiveStrokeColor: routeColor,
        routeStrokeColor: routeColor,
        routeStrokeWidth: ROUTE_STYLES.NORMAL_STROKE_WIDTH,
        routeStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
        routeActiveStrokeWidth: isRecommended ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH,
        routeActiveStrokeOpacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
        opacity: ROUTE_STYLES.BASE_STROKE_OPACITY,
      });
      applyRouteLineAppearance(multiRouteObj, routeColor, isRecommended ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH);
    });

    routesRef.current.forEach((route) => {
      yandexMapRef.current?.geoObjects.remove(route);
    });
    routesRef.current.forEach((route, idx) => {
      if (getRouteColorIndex(idx) !== 0) {
        yandexMapRef.current?.geoObjects.add(route);
      }
    });
    const recommendedRoute = routesRef.current.find((_, idx) => getRouteColorIndex(idx) === 0);
    if (recommendedRoute) {
      yandexMapRef.current.geoObjects.add(recommendedRoute);
    }
  }, [calculatedRoutes, getRouteColorIndex, yandexMapRef, routesRef]);

  useEffect(() => {
    if (!yandexMapRef.current || !window.ymaps) return;

    selectedRouteOverlaysRef.current.forEach((overlay) => {
      yandexMapRef.current?.geoObjects.remove(overlay);
    });
    selectedRouteOverlaysRef.current = [];

    calculatedRoutes.forEach((routeOption, routeIndex) => {
      const multiRoute = routesRef.current?.[routeIndex];
      const selectedAlternative =
        routeOption.alternatives[routeOption.selectedAlternativeIndex] ??
        routeOption.alternatives[0];
      const yandexRoutes = multiRoute
        ? toYandexRoutesArray(multiRoute.model.getRoutes())
        : [];
      const selectedYandexRoute =
        yandexRoutes[routeOption.selectedAlternativeIndex] ??
        yandexRoutes[0];

      let coordinates = selectedYandexRoute
        ? extractRouteCoordinates(selectedYandexRoute)
        : undefined;

      if (!coordinates && selectedAlternative?.geometry?.coordinates && selectedAlternative.geometry.coordinates.length > 2) {
        coordinates = selectedAlternative.geometry.coordinates;
      }

      if (!coordinates || coordinates.length < 2) return;

      const colorIndex = getRouteColorIndex(routeIndex);
      const isRecommended = colorIndex === 0;
      const color = getRouteColor(colorIndex);
      const width = isRecommended
        ? ROUTE_STYLES.FASTEST_STROKE_WIDTH
        : ROUTE_STYLES.NORMAL_STROKE_WIDTH;

      const overlay = new window.ymaps.Polyline(
        coordinates,
        {},
        {
          strokeColor: color,
          strokeWidth: width,
          strokeOpacity: ROUTE_STYLES.ACTIVE_OVERLAY_OPACITY,
          opacity: ROUTE_STYLES.ACTIVE_OVERLAY_OPACITY,
          zIndex: 1000 + colorIndex,
        }
      );

      yandexMapRef.current?.geoObjects.add(overlay);
      selectedRouteOverlaysRef.current.push(overlay);
    });

    return () => {
      selectedRouteOverlaysRef.current.forEach((overlay) => {
        yandexMapRef.current?.geoObjects.remove(overlay);
      });
      selectedRouteOverlaysRef.current = [];
    };
  }, [calculatedRoutes, getRouteColorIndex, yandexMapRef]);

  // Redux → карта: активная альтернатива
  useEffect(() => {
    if (!routesRef.current?.length || calculatedRoutes.length === 0) return;
    calculatedRoutes.forEach((ro, idx) => {
      const multi = routesRef.current![idx];
      if (!multi) return;
      const yaRoutes = toYandexRoutesArray(multi.model.getRoutes());
      const want = ro.selectedAlternativeIndex ?? 0;
      if (want < 0 || want >= yaRoutes.length || !yaRoutes[want]) return;
      const current = multi.getActiveRoute();
      if (current !== yaRoutes[want]) {
        try {
          multi.setActiveRoute(yaRoutes[want]);
        } catch {
          // ignore
        }
      }
      const colorIndex = getRouteColorIndex(idx);
      applyRouteLineAppearance(
        multi,
        getRouteColor(colorIndex),
        colorIndex === 0 ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH
      );
    });
  }, [calculatedRoutes, getRouteColorIndex, routesRef]);

  // Карта → Redux: пользователь сменил активный маршрут на карте
  useEffect(() => {
    const multis = routesRef.current;
    if (!multis?.length) return;

    const cleanups: Array<() => void> = [];

    multis.forEach((multi, routeIdx) => {
      const handler = () => {
        const yaRoutes = toYandexRoutesArray(multi.model.getRoutes());
        const active = multi.getActiveRoute();
        const found = active ? yaRoutes.findIndex((r) => r === active) : 0;
        const validIdx = found >= 0 ? found : 0;
        const ro = store.getState().route.routes[routeIdx];
        if (!ro?.alternatives?.length) return;
        if (validIdx >= ro.alternatives.length) return;
        const cur = ro.selectedAlternativeIndex ?? 0;
        if (validIdx !== cur) {
          store.dispatch(setSelectedAlternative({ routeIndex: routeIdx, alternativeIndex: validIdx }));
        }
        const colorIndex = getRouteColorIndex(routeIdx);
        applyRouteLineAppearance(
          multi,
          getRouteColor(colorIndex),
          colorIndex === 0 ? ROUTE_STYLES.FASTEST_STROKE_WIDTH : ROUTE_STYLES.NORMAL_STROKE_WIDTH
        );
      };
      multi.events.add("activeroutechange", handler);
      cleanups.push(() => {
        try {
          multi.events.remove("activeroutechange", handler);
        } catch {
          // ignore
        }
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [calculatedRoutes, getRouteColorIndex, routesRef, store]);

  // Эффект для открытия balloon по запросу из Redux
  useEffect(() => {
    if (requestedRouteIndex === null || !yandexMapRef.current || requestedRouteIndex < 0 || 
        requestedRouteIndex >= calculatedRoutes.length || requestedRouteIndex >= routesRef.current.length ||
        !startingPoint) {
      return;
    }

    const route = routesRef.current[requestedRouteIndex];
    const routeOption = calculatedRoutes[requestedRouteIndex];
    
    if (!route || !routeOption) {
      return;
    }

    // Получаем позицию balloon (середина маршрута или destination)
    const balloonPosition = recalculateBalloonPosition(
      route,
      yandexMapRef.current,
      routeOption.destination,
      routeOption,
      startingPoint
    );

    if (balloonPosition && 
        typeof balloonPosition.x === 'number' && 
        typeof balloonPosition.y === 'number' && 
        !isNaN(balloonPosition.x) && 
        !isNaN(balloonPosition.y)) {
      dispatch(openRouteBalloon({
        data: {
          routeIndex: requestedRouteIndex,
          destination: routeOption.destination,
          duration: routeOption.duration,
          distance: routeOption.distance,
          alternativeIndex: routeOption.selectedAlternativeIndex,
        },
        position: balloonPosition,
      }));
      // Сбрасываем запрос после открытия
      dispatch(clearRequestedRouteIndex());
    }
  }, [requestedRouteIndex, yandexMapRef, routesRef, calculatedRoutes, startingPoint, dispatch]);

  // Эффект для обновления данных balloon при появлении новых маршрутов
  // Выполняется сразу, как только маршруты готовы (не ждем isCalculating)
  useEffect(() => {
    if (!balloon.data || calculatedRoutes.length === 0) {
      return;
    }

    // Находим маршрут по destination
    const routeIndex = calculatedRoutes.findIndex(route => {
      const routeDest = route.destination;
      return (
        routeDest.address === balloon.data!.destination.address &&
        Math.abs(routeDest.coordinates[0] - balloon.data!.destination.coordinates[0]) < 0.0001 &&
        Math.abs(routeDest.coordinates[1] - balloon.data!.destination.coordinates[1]) < 0.0001
      );
    });

    if (routeIndex >= 0) {
      const routeOption = calculatedRoutes[routeIndex];
      
      // Обновляем данные balloon сразу, как только маршрут готов
      // Проверяем, изменились ли данные, чтобы не обновлять без необходимости
      if (balloon.data.duration !== routeOption.duration ||
          balloon.data.distance !== routeOption.distance ||
          balloon.data.routeIndex !== routeIndex ||
          balloon.data.alternativeIndex !== routeOption.selectedAlternativeIndex) {
        dispatch(updateRouteBalloonData({
          duration: routeOption.duration,
          distance: routeOption.distance,
          routeIndex,
          alternativeIndex: routeOption.selectedAlternativeIndex,
        }));
      }
    }
  }, [calculatedRoutes, balloon.data, transportMode, dispatch]);

  // Эффект для пересчета позиции balloon при изменении маршрутов
  useEffect(() => {
    if (!balloon.data || !yandexMapRef.current || isCalculating || calculatedRoutes.length === 0) {
      return;
    }

    // Проверяем, изменился ли тип транспорта - это основная причина для пересчета позиции
    const transportModeChanged = lastTransportModeRef.current !== transportMode;
    
    // Проверяем, изменились ли данные маршрута (duration/distance) - значит маршрут пересчитался
    const routeDataChanged = lastBalloonDataRef.current && (
      lastBalloonDataRef.current.duration !== balloon.data.duration ||
      lastBalloonDataRef.current.distance !== balloon.data.distance ||
      lastBalloonDataRef.current.alternativeIndex !== balloon.data.alternativeIndex
    );
    
    // Если balloon только что открыт (нет предыдущих данных), не пересчитываем позицию
    // Позиция уже установлена из события клика
    const isNewlyOpened = !lastBalloonDataRef.current;
    
    // Пересчитываем позицию только если:
    // 1. Изменился тип транспорта (маршрут перестроился)
    // 2. Или изменились данные маршрута (маршрут пересчитался)
    // 3. И balloon не был только что открыт
    if (isNewlyOpened && !transportModeChanged) {
      // Обновляем ref, но не пересчитываем позицию
      lastBalloonDataRef.current = balloon.data;
      lastTransportModeRef.current = transportMode;
      return;
    }
    
    if (!transportModeChanged && !routeDataChanged) {
      // Обновляем ref, но не пересчитываем позицию
      lastBalloonDataRef.current = balloon.data;
      lastTransportModeRef.current = transportMode;
      return;
    }

    // Добавляем небольшую задержку, чтобы дать время маршруту отрисоваться
    const timeoutId = setTimeout(() => {
      // Находим маршрут по destination
      const routeIndex = calculatedRoutes.findIndex(route => {
        const routeDest = route.destination;
        return (
          routeDest.address === balloon.data!.destination.address &&
          Math.abs(routeDest.coordinates[0] - balloon.data!.destination.coordinates[0]) < 0.0001 &&
          Math.abs(routeDest.coordinates[1] - balloon.data!.destination.coordinates[1]) < 0.0001
        );
      });

      if (routeIndex < 0 || !routesRef.current || routeIndex >= routesRef.current.length) {
        return;
      }

      const route = routesRef.current[routeIndex];
      if (!route) {
        return;
      }

      // Получаем данные маршрута из store
      const routeOption = calculatedRoutes[routeIndex];
      
      // Пересчитываем позицию balloon
      if (!yandexMapRef.current || !balloon.data || !startingPoint) return;
      
      const newPosition = recalculateBalloonPosition(
        route,
        yandexMapRef.current,
        balloon.data.destination,
        routeOption,
        startingPoint
      );

      if (newPosition && 
          typeof newPosition.x === 'number' && 
          typeof newPosition.y === 'number' && 
          !isNaN(newPosition.x) && 
          !isNaN(newPosition.y)) {
        console.log('Recalculating balloon position:', newPosition, { transportModeChanged, routeDataChanged });
        dispatch(updateRouteBalloonPosition(newPosition));
      }
      
      // Обновляем ref после пересчета
      lastBalloonDataRef.current = balloon.data;
      lastTransportModeRef.current = transportMode;
    }, 100); // Задержка 100ms для отрисовки маршрута

    return () => clearTimeout(timeoutId);
  }, [calculatedRoutes, balloon.data, isCalculating, transportMode, startingPoint, yandexMapRef, dispatch]);

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
    if (routesRef.current) {
      routesRef.current.splice(0, routesRef.current.length);
    }
    selectedRouteOverlaysRef.current = [];
    markersRef.current = [];

    // Создаем маркеры
    if (!window.ymaps) return;
    const markers = createAllMarkers(startingPoint, validDestinations, window.ymaps);
    markers.forEach(marker => {
      yandexMapRef.current?.geoObjects.add(marker);
    });
    markersRef.current = markers;

    // Запускаем расчёт маршрутов, если есть валидные адреса
    if (validDestinations.length > 0) {
      calculateRoutes(startingPoint, validDestinations, transportMode);
    }

    // Центрируем карту только при смене стартовой точки, чтобы пересчет маршрутов не дергал камеру.
    const startKey = startingPoint.coordinates.join(",");
    if (lastCenteredStartRef.current !== startKey) {
      yandexMapRef.current.setCenter(startingPoint.coordinates, STARTING_POINT_ZOOM, {
        duration: MAP_ANIMATION_DURATION,
      });
      lastCenteredStartRef.current = startKey;
    }
  }, [startingPoint, validDestinationsKey, transportMode, calculateRoutes]);

  useEffect(() => {
    if (!yandexMapRef.current || !window.ymaps || !startingPoint) return;

    markersRef.current.forEach((marker) => {
      yandexMapRef.current?.geoObjects.remove(marker);
    });

    const markers = createAllMarkers(startingPoint, validDestinations, window.ymaps, {
      destinationStyles: destinationMarkerStyles,
    });
    markers.forEach((marker) => {
      yandexMapRef.current?.geoObjects.add(marker);
    });
    markersRef.current = markers;
  }, [startingPoint, validDestinationsKey, destinationMarkerStyles, yandexMapRef]);

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
