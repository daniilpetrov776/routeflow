import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { formatDuration, formatDistance } from "@/lib/route";
import { sanitizeText } from "@/lib/sanitize";
import type { RouteOption } from "@/store/route-slice";
import styles from "./route-results.module.css";

interface RouteCardProps {
  route: RouteOption;
  index: number;
  isFastest: boolean;
}

/**
 * Получает CSS класс для цвета пробок
 */
const getTrafficColor = (level: string): string => {
  switch (level) {
    case 'light':
      return styles["route-results__card-field-value--green"];
    case 'moderate':
      return styles["route-results__card-field-value--yellow"];
    case 'heavy':
      return styles["route-results__card-field-value--red"];
    default:
      return styles["route-results__card-field-value--muted"];
  }
};

/**
 * Получает текстовую метку для уровня пробок
 */
const getTrafficLabel = (level: string): string => {
  switch (level) {
    case 'light':
      return 'Свободно';
    case 'moderate':
      return 'Умеренно';
    case 'heavy':
      return 'Плотно';
    default:
      return level;
  }
};

/**
 * Обрезает адрес, если он слишком длинный
 */
const truncateAddress = (address: string, maxLength: number = 20): string => {
  return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address;
};

export function RouteCard({ route, index, isFastest }: RouteCardProps) {
  return (
    <Card
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
            <div
              className={`${styles["route-results__card-field-value"]} capitalize ${getTrafficColor(route.traffic_info.level)}`}
            >
              {getTrafficLabel(route.traffic_info.level)}
            </div>
          </div>
          <div className={styles["route-results__card-field"]}>
            <span className={styles["route-results__card-field-label"]}>Назначение:</span>
            <div
              className={`${styles["route-results__card-field-value"]} ${styles["route-results__card-field-value--small"]}`}
            >
              {sanitizeText(truncateAddress(route.destination.address))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

