import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import type { AddressPoint } from "@/store/route-slice";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import styles from "./route-balloon.module.css";

export interface RouteBalloonData {
  routeIndex: number;
  destination: {
    address: string;
    coordinates: [number, number];
  };
  duration: number;
  distance: number;
}

interface RouteBalloonProps {
  data: RouteBalloonData | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

/**
 * Форматирует длительность в секундах в читаемый формат (русский)
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
};

/**
 * Форматирует расстояние в метрах в читаемый формат (русский)
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} км`;
  }
  return `${meters} м`;
};

export function RouteBalloon({ data, position, onClose }: RouteBalloonProps) {
  const balloonRef = useRef<HTMLDivElement>(null);
  
  // Получаем актуальные данные маршрута из store
  const routes = useSelector((state: RootState) => state.route.routes);
  const destinations = useSelector((state: RootState) => state.route.destinations);
  const isCalculating = useSelector((state: RootState) => state.route.isCalculating);
  const transportMode = useSelector((state: RootState) => state.route.transportMode);
  
  // Находим маршрут по destination (адрес и координаты), а не по индексу
  // Это позволяет найти маршрут даже после пересчета, когда индексы могут измениться
  const findRouteByDestination = (targetDestination: AddressPoint) => {
    return routes.findIndex(route => {
      const routeDest = route.destination;
      return (
        routeDest.address === targetDestination.address &&
        Math.abs(routeDest.coordinates[0] - targetDestination.coordinates[0]) < 0.0001 &&
        Math.abs(routeDest.coordinates[1] - targetDestination.coordinates[1]) < 0.0001
      );
    });
  };
  
  // Проверяем, существует ли destination в списке destinations
  const destinationExists = data ? destinations.some(dest => 
    dest.address === data.destination.address &&
    Math.abs(dest.coordinates[0] - data.destination.coordinates[0]) < 0.0001 &&
    Math.abs(dest.coordinates[1] - data.destination.coordinates[1]) < 0.0001
  ) : false;
  
  // Находим актуальный маршрут по destination
  const currentRouteIndex = data ? findRouteByDestination(data.destination) : -1;
  const currentRoute = currentRouteIndex >= 0 ? routes[currentRouteIndex] : null;
  
  // Используем актуальные данные из store
  // Данные обновляются через updateRouteBalloonData сразу, как только маршруты готовы
  // Если currentRoute доступен и его данные новее, используем их (на случай задержки обновления store)
  const displayData = data ? {
    ...data,
    routeIndex: currentRouteIndex >= 0 ? currentRouteIndex : data.routeIndex,
    // Используем данные из currentRoute, если они доступны (более актуальные)
    // Иначе используем данные из store (data)
    duration: currentRoute?.duration ?? data.duration,
    distance: currentRoute?.distance ?? data.distance,
  } : null;

  // Обработчик ESC для закрытия balloon
  useEffect(() => {
    if (!data || !position) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [data, position, onClose]);

  // Закрываем balloon, если пункт назначения был удален
  useEffect(() => {
    if (!data) return;
    
    // Проверяем, что пункт назначения все еще существует в списке destinations
    if (!destinationExists) {
      console.log('Destination was removed, closing balloon', { 
        destination: data.destination.address,
        destinationsCount: destinations.length
      });
      onClose();
      return;
    }
    
    // Если маршрут еще не рассчитан (routes пуст или calculating), не закрываем balloon
    // Это позволяет сохранить balloon во время пересчета маршрутов
    if (routes.length === 0 || isCalculating) {
      console.log('Routes are being recalculated, keeping balloon open', { 
        routesLength: routes.length, 
        isCalculating 
      });
      return;
    }
    
    // Проверяем, что маршрут для этого destination существует
    // Но даем больше времени - возможно маршрут еще не успел появиться
    if (currentRouteIndex < 0) {
      // Не закрываем сразу, возможно маршрут еще загружается
      // Закрываем только если прошло достаточно времени и маршрут точно не появится
      console.log('Route for destination not found yet, waiting...', { 
        destination: data.destination.address,
        routesCount: routes.length
      });
      // Не закрываем balloon - даем время маршруту появиться
      return;
    }
  }, [data, destinationExists, currentRouteIndex, routes, destinations, isCalculating, onClose]);

  useEffect(() => {
    if (displayData && position) {
      console.log('RouteBalloon rendering with data:', displayData, 'position:', position);
    }
  }, [displayData, position]);

  useEffect(() => {
    if (!balloonRef.current || !position) {
      console.log('RouteBalloon useEffect: no ref or position', { hasRef: !!balloonRef.current, position });
      return;
    }

    // Проверяем, что позиция валидна
    if (typeof position.x !== 'number' || typeof position.y !== 'number' || isNaN(position.x) || isNaN(position.y)) {
      console.warn('Invalid position:', position);
      return;
    }

    console.log('Setting balloon position:', position);

    // Устанавливаем начальную позицию сразу
    balloonRef.current.style.left = `${position.x}px`;
    balloonRef.current.style.top = `${position.y}px`;
    balloonRef.current.style.position = 'fixed';
    balloonRef.current.style.zIndex = '9999';
    balloonRef.current.style.display = 'block';
    balloonRef.current.style.visibility = 'visible';
    balloonRef.current.style.opacity = '1';

    // Корректируем позицию, чтобы balloon не выходил за границы экрана
    // Используем requestAnimationFrame, чтобы убедиться, что элемент уже отрендерен
    requestAnimationFrame(() => {
      if (!balloonRef.current) return;
      
      const rect = balloonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Смещаем влево, если выходит за правую границу
      if (adjustedX + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      // Смещаем вверх, если выходит за нижнюю границу
      if (adjustedY + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      // Минимальные отступы от краев
      adjustedX = Math.max(10, adjustedX);
      adjustedY = Math.max(10, adjustedY);

      if (balloonRef.current) {
        balloonRef.current.style.left = `${adjustedX}px`;
        balloonRef.current.style.top = `${adjustedY}px`;
        console.log('Balloon positioned at:', { x: adjustedX, y: adjustedY, rect });
      }
    });
  }, [position]);

  if (!displayData || !position) {
    console.log('RouteBalloon: no data or position, returning null', { data: !!displayData, position: !!position });
    return null;
  }

  console.log('RouteBalloon: rendering component', { displayData, position, transportMode });

  const balloonContent = (
    <Card
      ref={balloonRef}
      className={styles["route-balloon"]}
      style={{
        position: "fixed",
        zIndex: 9999,
        minWidth: "250px",
        maxWidth: "350px",
        left: `${position.x}px`,
        top: `${position.y}px`,
        display: 'block',
        visibility: 'visible',
        opacity: '1',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CardContent className={styles["route-balloon__content"]}>
        <Button
          variant="ghost"
          size="icon"
          className={styles["route-balloon__close"]}
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className={styles["route-balloon__header"]}>
          <strong>Маршрут {displayData.routeIndex + 1}</strong>
        </div>

        <div className={styles["route-balloon__body"]}>
          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>🚗 Режим:</span>
            <span className={styles["route-balloon__value"]}>
              {transportMode === 'driving' ? 'Автомобиль' :
               transportMode === 'walking' ? 'Пешком' :
               transportMode === 'cycling' ? 'Велосипед' :
               transportMode === 'transit' ? 'Общественный транспорт' : transportMode}
            </span>
          </div>

          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>⏱️ Время:</span>
            <span className={styles["route-balloon__value"]}>
              {formatDuration(displayData.duration)}
            </span>
          </div>

          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>📏 Расстояние:</span>
            <span className={styles["route-balloon__value"]}>
              {formatDistance(displayData.distance)}
            </span>
          </div>

          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>📍 Назначение:</span>
            <span className={styles["route-balloon__value"]}>
              {displayData.destination.address}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Рендерим через Portal в body, чтобы избежать проблем с overflow: hidden
  return typeof document !== 'undefined' ? createPortal(balloonContent, document.body) : null;
}

