import { useMemo } from "react";
import type { RouteOption } from "@/store/route-slice";
import styles from "./route-sidebar.module.css";

/**
 * Форматирует длительность в секундах в читаемый формат
 * Если больше часа - "X ч Y мин", если меньше - "Y мин"
 */
const formatBestTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
};

interface RouteSummaryProps {
  routes: RouteOption[];
}

export function RouteSummary({ routes }: RouteSummaryProps) {
  // Вычисляем лучшее время в секундах (мемоизировано для оптимизации)
  const bestTimeSeconds = useMemo(() => {
    if (routes.length === 0) return 0;
    return Math.min(...routes.map((r) => r.duration));
  }, [routes]);

  // Форматируем лучшее время
  const formattedBestTime = useMemo(() => {
    if (bestTimeSeconds === 0) return "0 мин";
    return formatBestTime(bestTimeSeconds);
  }, [bestTimeSeconds]);

  if (routes.length === 0) {
    return null;
  }

  return (
    <div className={styles["route-sidebar__summary"]}>
      <h4 className={styles["route-sidebar__summary-title"]}>
        Сводная статистика
      </h4>
      <div className={styles["route-sidebar__summary-grid"]}>
        <div className={styles["route-sidebar__summary-item"]}>
          <div className={styles["route-sidebar__summary-value"]}>
            {routes.length}
          </div>
          <div className={styles["route-sidebar__summary-label"]}>
            Найдено маршрутов
          </div>
        </div>
        <div className={styles["route-sidebar__summary-item"]}>
          <div className={styles["route-sidebar__summary-value--green"]}>
            {formattedBestTime}
          </div>
          <div className={styles["route-sidebar__summary-label"]}>
            Лучшее время
          </div>
        </div>
      </div>
    </div>
  );
}
