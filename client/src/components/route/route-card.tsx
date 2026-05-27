import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CSSProperties } from "react";
import { getRouteColor } from "@/lib/map-constants";
import { formatDuration, formatDistance } from "@/lib/route";
import { sanitizeText } from "@/lib/sanitize";
import type { RouteOption, TransportMode } from "@/store/route-slice";
import styles from "./route-results.module.css";

interface RouteCardProps {
  route: RouteOption;
  index: number;
  isRecommended: boolean;
  transportMode: TransportMode;
  onClick?: () => void;
  onSelectAlternative?: (alternativeIndex: number) => void;
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
const truncateAddress = (address: string, maxLength: number = 54): string => {
  return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address;
};

export function RouteCard({
  route,
  index,
  isRecommended,
  transportMode,
  onClick,
  onSelectAlternative,
}: RouteCardProps) {
  const routeColor = getRouteColor(index);
  const hasAlternatives = route.alternatives.length > 1;
  const showStairs = transportMode === "walking" || transportMode === "cycling";

  return (
    <Card
      className={`${styles["route-results__card"]} ${isRecommended ? styles["route-results__card--recommended"] : ''} ${onClick ? styles["route-results__card--clickable"] : ''}`}
      style={{ "--route-color": routeColor } as CSSProperties}
      onClick={onClick}
    >
      <CardContent className={styles["route-results__card-content"]}>
        <div className={styles["route-results__card-header"]}>
          <div className={styles["route-results__card-header-left"]}>
            <span
              className={styles["route-results__card-position"]}
              aria-label={`Позиция ${index + 1}`}
            >
              {index + 1}
            </span>
            <span className={styles["route-results__card-title"]}>
              {sanitizeText(truncateAddress(route.destination.address))}
            </span>
          </div>
          {isRecommended && (
            <Badge variant="secondary" className={styles["route-results__card-badge"]}>
              Рекомендуемый
            </Badge>
          )}
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
            <span className={styles["route-results__card-field-label"]}>
              {showStairs ? "Лестницы:" : "Пробки:"}
            </span>
            <div className={`${styles["route-results__card-field-value"]} ${showStairs ? "" : getTrafficColor(route.traffic_info.level)}`}>
              {showStairs ? route.stairsCount ?? 0 : getTrafficLabel(route.traffic_info.level)}
            </div>
          </div>
        </div>

        {hasAlternatives && (
          <div
            className={styles["route-results__alternatives"]}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className={styles["route-results__alternatives-title"]}>
              Альтернативные маршруты
            </div>
            <div className={styles["route-results__alternatives-list"]}>
              {route.alternatives.map((alternative, alternativeIndex) => {
                const isSelected = route.selectedAlternativeIndex === alternativeIndex;

                return (
                  <button
                    key={alternative.id}
                    type="button"
                    className={`${styles["route-results__alternative"]} ${
                      isSelected ? styles["route-results__alternative--selected"] : ""
                    }`}
                    onClick={() => onSelectAlternative?.(alternativeIndex)}
                  >
                    <span className={styles["route-results__alternative-name"]}>
                      {alternativeIndex === 0 ? "Основной" : `Альтернатива ${alternativeIndex}`}
                    </span>
                    <span>{formatDuration(alternative.duration)}</span>
                    <span>{formatDistance(alternative.distance)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

