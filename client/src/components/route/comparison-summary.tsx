import { useMemo } from "react";
import { formatDistance, formatDuration } from "@/lib/route";
import type { TransportMode } from "@/store/route-slice";
import type { RouteOption } from "@/store/route-slice";
import styles from "./comparison-summary.module.css";

export type RouteDisplayItem = {
  route: RouteOption;
  originalIndex: number;
  colorIndex: number;
  isRecommended: boolean;
};

export function ComparisonSummary({
  items,
  destinationCount,
}: {
  items: RouteDisplayItem[];
  destinationCount: number;
}) {
  const summary = useMemo(() => {
    if (items.length === 0) return null;

    const fastest = items.reduce((best, item) =>
      item.route.duration < best.route.duration ? item : best
    );
    const shortest = items.reduce((best, item) =>
      item.route.distance < best.route.distance ? item : best
    );
    const recommended = items[0];

    return {
      recommended: recommended.originalIndex + 1,
      fastest: fastest.originalIndex + 1,
      fastestValue: formatDuration(fastest.route.duration),
      shortest: shortest.originalIndex + 1,
      shortestValue: formatDistance(shortest.route.distance),
    };
  }, [items]);

  if (destinationCount === 0) return null;

  if (destinationCount === 1) {
    return (
      <div className={styles.insights}>
        <p className={styles.emptyMessage}>
          Для сравнения нужно минимум 2 пункта назначения
        </p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={styles.insights}>
      <div className={styles.insight}>
        <span className={styles.insightLabel}>Рекомендован</span>
        <strong className={styles.insightValue}>#{summary.recommended}</strong>
      </div>
      <div className={styles.insight}>
        <span className={styles.insightLabel}>Быстрее</span>
        <strong className={styles.insightValue}>
          #{summary.fastest} · {summary.fastestValue}
        </strong>
      </div>
      <div className={styles.insight}>
        <span className={styles.insightLabel}>Короче</span>
        <strong className={styles.insightValue}>
          #{summary.shortest} · {summary.shortestValue}
        </strong>
      </div>
    </div>
  );
}

