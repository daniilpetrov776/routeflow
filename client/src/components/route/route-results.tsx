import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LayoutGroup, motion } from "framer-motion";
import { RootState } from "@/store";
import {
  requestOpenRouteBalloonByIndex,
  setRouteSortMode,
  setSelectedAlternative,
} from "@/store/route-slice";
import { getRouteDisplayItems } from "@/lib/route/route-display-order";
import { formatDistance, formatDuration } from "@/lib/route";
import { RouteCard } from "./route-card";
import styles from "./route-results.module.css";

export function RouteResults() {
  const { routes, routeSortMode, transportMode, isCalculating, destinations } = useSelector((state: RootState) => state.route);
  const dispatch = useDispatch();

  const sortedRoutes = useMemo(
    () => getRouteDisplayItems(routes, routeSortMode, transportMode),
    [routes, routeSortMode, transportMode]
  );

  const comparisonSummary = useMemo(() => {
    if (routes.length === 0 || sortedRoutes.length === 0) return null;

    const fastest = sortedRoutes.reduce((best, item) =>
      item.route.duration < best.route.duration ? item : best
    );
    const shortest = sortedRoutes.reduce((best, item) =>
      item.route.distance < best.route.distance ? item : best
    );
    const recommended = sortedRoutes[0];

    return {
      recommended: recommended.originalIndex + 1,
      fastest: fastest.originalIndex + 1,
      fastestValue: formatDuration(fastest.route.duration),
      shortest: shortest.originalIndex + 1,
      shortestValue: formatDistance(shortest.route.distance),
    };
  }, [routes.length, sortedRoutes]);

  const loadingCardCount = useMemo(() => {
    const validDestinations = destinations.filter((destination) => destination.address?.trim()).length;
    return Math.max(1, validDestinations);
  }, [destinations]);

  useEffect(() => {
    if (routeSortMode === "traffic" && transportMode !== "driving") {
      dispatch(setRouteSortMode("time"));
    }
    if (routeSortMode === "transfers" && transportMode !== "transit") {
      dispatch(setRouteSortMode("time"));
    }
  }, [dispatch, routeSortMode, transportMode]);

  if (routes.length === 0) {
    return (
      <div className={styles["route-results"]}>
        <div className={styles["route-results__header"]}>
          <h3 className={styles["route-results__title"]}>Варианты маршрутов</h3>
        </div>
        {isCalculating ? (
          <div className={styles["route-results__loading-list"]} aria-live="polite">
            {Array.from({ length: loadingCardCount }).map((_, index) => (
              <div key={index} className={styles["route-results__skeleton-card"]}>
                <div className={styles["route-results__skeleton-header"]}>
                  <span className={styles["route-results__skeleton-dot"]} />
                  <span className={styles["route-results__skeleton-line"]} />
                  {index === 0 && <span className={styles["route-results__skeleton-badge"]} />}
                </div>
                <div className={styles["route-results__skeleton-grid"]}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles["route-results__skeleton-alternatives"]}>
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles["route-results__empty-content"]}>
            <div className={styles["route-results__empty-icon"]}>🗺️</div>
            <p>Рассчитайте маршруты, чтобы увидеть варианты</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles["route-results"]}>
      <div className={styles["route-results__header"]}>
        <h3 className={styles["route-results__title"]}>Варианты маршрутов</h3>
      </div>
      <div className={styles["route-results__sort"]} aria-label="Сортировка маршрутов">
        <button
          type="button"
          className={`${styles["route-results__sort-button"]} ${
            routeSortMode === "time" ? styles["route-results__sort-button--active"] : ""
          }`}
          onClick={() => dispatch(setRouteSortMode("time"))}
        >
          Время
        </button>
        <button
          type="button"
          className={`${styles["route-results__sort-button"]} ${
            routeSortMode === "distance" ? styles["route-results__sort-button--active"] : ""
          }`}
          onClick={() => dispatch(setRouteSortMode("distance"))}
        >
          Расстояние
        </button>
        {transportMode === "driving" && (
          <button
            type="button"
            className={`${styles["route-results__sort-button"]} ${
              routeSortMode === "traffic" ? styles["route-results__sort-button--active"] : ""
            }`}
            onClick={() => dispatch(setRouteSortMode("traffic"))}
          >
            Пробки
          </button>
        )}
        {transportMode === "transit" && (
          <button
            type="button"
            className={`${styles["route-results__sort-button"]} ${
              routeSortMode === "transfers" ? styles["route-results__sort-button--active"] : ""
            }`}
            onClick={() => dispatch(setRouteSortMode("transfers"))}
          >
            Пересадки
          </button>
        )}
      </div>

      {comparisonSummary && (
        <div className={styles["route-results__insights"]}>
          <div className={styles["route-results__insight"]}>
            <span className={styles["route-results__insight-label"]}>Рекомендован</span>
            <strong>#{comparisonSummary.recommended}</strong>
          </div>
          <div className={styles["route-results__insight"]}>
            <span className={styles["route-results__insight-label"]}>Быстрее</span>
            <strong>#{comparisonSummary.fastest} · {comparisonSummary.fastestValue}</strong>
          </div>
          <div className={styles["route-results__insight"]}>
            <span className={styles["route-results__insight-label"]}>Короче</span>
            <strong>#{comparisonSummary.shortest} · {comparisonSummary.shortestValue}</strong>
          </div>
        </div>
      )}

      {isCalculating && (
        <div className={styles["route-results__soft-loader"]} aria-live="polite">
          <span className={styles["route-results__soft-loader-spinner"]} />
          <span>Обновляем маршруты</span>
        </div>
      )}

      <LayoutGroup>
        {sortedRoutes.map(({ route, originalIndex, colorIndex, isRecommended }) => (
          <motion.div
            key={route.id}
            layout
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={styles["route-results__card-motion"]}
          >
            <RouteCard
              route={route}
              routes={routes}
              index={colorIndex}
              isRecommended={isRecommended}
              transportMode={transportMode}
              onClick={() => dispatch(requestOpenRouteBalloonByIndex(originalIndex))}
              onSelectAlternative={(alternativeIndex) =>
                dispatch(setSelectedAlternative({ routeIndex: originalIndex, alternativeIndex }))
              }
            />
          </motion.div>
        ))}
      </LayoutGroup>
    </div>
  );
}
