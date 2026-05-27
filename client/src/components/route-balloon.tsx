import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { formatDistance, formatDuration } from "@/lib/route";
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

export function RouteBalloon({ data, position, onClose }: RouteBalloonProps) {
  const balloonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && position) {
      console.log('RouteBalloon rendering with data:', data, 'position:', position);
    }
  }, [data, position]);

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

  if (!data || !position) {
    console.log('RouteBalloon: no data or position, returning null', { data: !!data, position: !!position });
    return null;
  }

  console.log('RouteBalloon: rendering component', { data, position });

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
          <strong>Маршрут {data.routeIndex + 1}</strong>
        </div>

        <div className={styles["route-balloon__body"]}>
          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>⏱️ Время:</span>
            <span className={styles["route-balloon__value"]}>
              {formatDuration(data.duration)}
            </span>
          </div>

          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>📏 Расстояние:</span>
            <span className={styles["route-balloon__value"]}>
              {formatDistance(data.distance)}
            </span>
          </div>

          <div className={styles["route-balloon__field"]}>
            <span className={styles["route-balloon__label"]}>📍 Назначение:</span>
            <span className={styles["route-balloon__value"]}>
              {data.destination.address}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Рендерим через Portal в body, чтобы избежать проблем с overflow: hidden
  return typeof document !== 'undefined' ? createPortal(balloonContent, document.body) : null;
}

