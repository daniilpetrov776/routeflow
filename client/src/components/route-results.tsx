import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { RouteCard } from "./route-card";
import styles from "./route-results.module.css";

export function RouteResults() {
  const { routes } = useSelector((state: RootState) => state.route);

  // Находим самый быстрый маршрут (мемоизирован для оптимизации)
  const fastestRoute = useMemo(() => {
    if (routes.length === 0) return null;
    return routes.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest
    );
  }, [routes]);

  if (routes.length === 0) {
    return (
      <div className={styles["route-results__empty"]}>
        <h3 className={styles["route-results__empty-title"]}>Варианты маршрутов</h3>
        <div className={styles["route-results__empty-content"]}>
          <div className={styles["route-results__empty-icon"]}>🗺️</div>
          <p>Рассчитайте маршруты, чтобы увидеть варианты</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["route-results"]}>
      <h3 className={styles["route-results__title"]}>Варианты маршрутов</h3>

      {routes.map((route, index) => (
        <RouteCard
          key={route.id}
          route={route}
          index={index}
          isFastest={fastestRoute ? route.id === fastestRoute.id : false}
        />
      ))}
    </div>
  );
}
