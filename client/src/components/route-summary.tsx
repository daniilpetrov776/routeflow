import type { RouteOption } from "@/store/route-slice";
import styles from "./route-sidebar.module.css";

interface RouteSummaryProps {
  routes: RouteOption[];
}

export function RouteSummary({ routes }: RouteSummaryProps) {
  if (routes.length === 0) {
    return null;
  }

  const bestTime = Math.min(...routes.map((r) => Math.round(r.duration / 60)));

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
            {bestTime}м
          </div>
          <div className={styles["route-sidebar__summary-label"]}>
            Лучшее время
          </div>
        </div>
      </div>
    </div>
  );
}

