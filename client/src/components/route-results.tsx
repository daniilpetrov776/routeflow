import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import styles from "./route-results.module.css";

export function RouteResults() {

  const { routes } = useSelector((state: RootState) => state.route);

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTrafficColor = (level: string) => {
    switch (level) {
      case 'light': return styles["route-results__card-field-value--green"];
      case 'moderate': return styles["route-results__card-field-value--yellow"];
      case 'heavy': return styles["route-results__card-field-value--red"];
      default: return styles["route-results__card-field-value--muted"];
    }
  };

  const getTrafficLabel = (level: string) => {
    switch (level) {
      case 'light': return 'Свободно';
      case 'moderate': return 'Умеренно';
      case 'heavy': return 'Плотно';
      default: return level;
    }
  };

  const fastestRoute = routes.reduce((fastest, current) => 
    current.duration < fastest.duration ? current : fastest
  );

  return (
    <div className={styles["route-results"]}>
      <h3 className={styles["route-results__title"]}>Варианты маршрутов</h3>
      
      {routes.map((route, index) => {
        const isFastest = route.id === fastestRoute.id;
        
        return (
          <Card
            key={route.id}
            className={`${styles["route-results__card"]} ${isFastest ? styles["route-results__card--fastest"] : ''}`}
          >
            <CardContent className={styles["route-results__card-content"]}>
              <div className={styles["route-results__card-header"]}>
                <div className={styles["route-results__card-header-left"]}>
                  {isFastest && (
                    <Badge variant="secondary" className={styles["route-results__card-badge"]}>
                      БЫСТРЕЙШИЙ
                    </Badge>
                  )}
                  <span className={styles["route-results__card-title"]}>
                    Маршрут {index + 1}
                  </span>
                </div>
                {isFastest && <Crown className={styles["route-results__card-crown"]} />}
              </div>
              
              <div className={styles["route-results__card-grid"]}>
                <div className={styles["route-results__card-field"]}>
                  <span className={styles["route-results__card-field-label"]}>Время:</span>
                  <div className={styles["route-results__card-field-value"]}>
                    {formatDuration(route.duration)}
                  </div>
                </div>
                <div className={styles["route-results__card-field"]}>
                  <span className={styles["route-results__card-field-label"]}>Расстояние:</span>
                  <div className={styles["route-results__card-field-value"]}>
                    {formatDistance(route.distance)}
                  </div>
                </div>
                <div className={styles["route-results__card-field"]}>
                  <span className={styles["route-results__card-field-label"]}>Пробки:</span>
                  <div className={`${styles["route-results__card-field-value"]} capitalize ${getTrafficColor(route.traffic_info.level)}`}>
                    {getTrafficLabel(route.traffic_info.level)}
                  </div>
                </div>
                <div className={styles["route-results__card-field"]}>
                  <span className={styles["route-results__card-field-label"]}>Назначение:</span>
                  <div className={`${styles["route-results__card-field-value"]} ${styles["route-results__card-field-value--small"]}`}>
                    {route.destination.address.length > 20 ? route.destination.address.substring(0, 20) + '...' : route.destination.address}
                  </div>
                </div>
              </div>
              

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
