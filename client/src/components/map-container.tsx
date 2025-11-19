import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { createAllMarkers } from "@/lib/map-markers";
import { MapControls } from "./map-controls";
import { MapLoadingState } from "./map-loading-state";
import { MapCalculatingState } from "./map-calculating-state";
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

  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const { isCalculating, transportMode } = useSelector((state: RootState) => state.route);

  const { calculateRoutes } = useRouteCalculation({
    yandexMapRef,
    routesRef,
  });

  // Индекс самого быстрого маршрута
  const fastestIndex = calculatedRoutes.length > 0
    ? calculatedRoutes.reduce(
        (bestIdx, _, i) =>
          calculatedRoutes[i].duration < calculatedRoutes[bestIdx].duration
            ? i
            : bestIdx,
        0
      )
    : 0;

  // Эффект для обновления стилей уже отрисованных маршрутов
  useEffect(() => {
    if (!yandexMapRef.current) return;

    routesRef.current.forEach((multiRouteObj, idx) => {
      const isFastest = idx === fastestIndex;
      multiRouteObj.options.set({
        routeActiveStrokeColor: isFastest ? '#28a745' : '#007bff',
        routeActiveStrokeWidth: isFastest ? 6 : 4,
        opacity: isFastest ? 1.0 : 0.7,
      });
    });
  }, [calculatedRoutes, fastestIndex]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = () => {
      if (window.ymaps && mapRef.current) {
        yandexMapRef.current = new window.ymaps.Map(mapRef.current, {
          center: [55.76, 37.64],
          zoom: 10,
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
    const markers = createAllMarkers(startingPoint, destinations, window.ymaps);
    markers.forEach(marker => {
      yandexMapRef.current?.geoObjects.add(marker);
    });

    // Запускаем расчёт маршрутов, если есть валидные адреса
    const validDestinations = destinations.filter(d => d.address?.trim());
    if (validDestinations.length > 0) {
      calculateRoutes(startingPoint, validDestinations, transportMode);
    }

    // Центрируем карту на начальной точке
    yandexMapRef.current.setCenter(startingPoint.coordinates, 12, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingPoint, destinations, transportMode]);

  // Обработчики контролов карты
  const handleZoomIn = () => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() - 1);
    }
  };

  const handleCenter = () => {
    if (yandexMapRef.current && startingPoint) {
      yandexMapRef.current.setCenter(startingPoint.coordinates);
    }
  };

  return (
    <div className={styles["map-container"]}>
      <div ref={mapRef} className={styles["map-container__map"]} style={{ minHeight: '100%' }} />

      {!isLoaded && <MapLoadingState />}

      {isCalculating && <MapCalculatingState />}

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
      />
    </div>
  );
}
