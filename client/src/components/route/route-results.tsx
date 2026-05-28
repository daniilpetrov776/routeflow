import { useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { RootState } from "@/store";
import {
  clearDestinations,
  removeDestination,
  requestOpenRouteBalloonByIndex,
  setRouteSortMode,
  setSelectedAlternative,
} from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { getRouteDisplayItems } from "@/lib/route/route-display-order";
import { AddressInput } from "../address/address-input";
import { RouteCard } from "./route-card";
import styles from "./route-results.module.css";
import { DestinationsSection } from "./destinations-section";
import { ComparisonSummary, type RouteDisplayItem } from "./comparison-summary";
import { RouteCardMotion, routeCardMotionStyles } from "./route-card-motion";
import { Trash2 } from "lucide-react";

export function RouteResults({ error }: { error: string | null }) {
  const { routes, routeSortMode, transportMode, isCalculating, destinations, startingPoint } = useSelector((state: RootState) => state.route);
  const dispatch = useDispatch();
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const prevLengthRef = useRef(destinations.length);

  const isSameDestination = (
    a: { address: string; coordinates: [number, number] },
    b: { address: string; coordinates: [number, number] }
  ) =>
    a.address === b.address &&
    Math.abs(a.coordinates[0] - b.coordinates[0]) < 0.0001 &&
    Math.abs(a.coordinates[1] - b.coordinates[1]) < 0.0001;

  const sortedRoutes = useMemo(
    () => getRouteDisplayItems(routes, routeSortMode, transportMode),
    [routes, routeSortMode, transportMode]
  );

  const validDestinationCount = useMemo(
    () => destinations.filter((destination) => destination.address?.trim()).length,
    [destinations]
  );
  const hasStartingPoint = Boolean(startingPoint?.address?.trim());

  const loadingCardCount = useMemo(() => {
    return Math.max(1, validDestinationCount);
  }, [validDestinationCount]);

  useEffect(() => {
    if (routeSortMode === "traffic" && transportMode !== "driving") {
      dispatch(setRouteSortMode("time"));
    }
    if (routeSortMode === "transfers" && transportMode !== "transit") {
      dispatch(setRouteSortMode("time"));
    }
  }, [dispatch, routeSortMode, transportMode]);

  useEffect(() => {
    if (destinations.length > prevLengthRef.current) {
      const lastIndex = destinations.length - 1;
      const lastInput = inputRefs.current.get(lastIndex);
      if (lastInput && !destinations[lastIndex]?.address) {
        setTimeout(() => {
          const scrollContainer = lastInput.closest('[class*="route-sidebar"]') as HTMLElement | null;
          const scrollTop = scrollContainer?.scrollTop;
          lastInput.focus({ preventScroll: true });
          if (scrollContainer && scrollTop !== undefined) {
            scrollContainer.scrollTop = scrollTop;
            requestAnimationFrame(() => {
              scrollContainer.scrollTop = scrollTop;
            });
          }
        }, 0);
      }
    }
    prevLengthRef.current = destinations.length;
  }, [destinations]);

  const setInputRef = (index: number, ref: HTMLInputElement | null) => {
    if (ref) {
      inputRefs.current.set(index, ref);
      return;
    }
    inputRefs.current.delete(index);
  };

  const pendingDestinationIndexes = useMemo(
    () =>
      destinations
        .map((destination, index) => ({ destination, index }))
        .filter(({ destination }) => !routes.some((route) => isSameDestination(route.destination, destination)))
        .map(({ index }) => index),
    [destinations, routes]
  );
  const displayedCardCount = pendingDestinationIndexes.length + sortedRoutes.length;
  const canClearAll = displayedCardCount >= 2;

  const handleRemoveByRoute = (originalIndex: number) => {
    const destination = routes[originalIndex]?.destination;
    if (!destination) return;

    const destinationIndex = destinations.findIndex((item) =>
      isSameDestination(item, destination)
    );

    if (destinationIndex >= 0) {
      dispatch(removeDestination(destinationIndex));
    }
  };

  const handleClearAll = () => {
    inputRefs.current.clear();
    dispatch(clearDestinations());
  };

  if (routes.length === 0) {
    return (
      <div className={styles["route-results"]}>
        <div className={styles["route-results__header"]}>
          <h3 className={styles["route-results__title"]}>Пункты назначения</h3>
        </div>
        <ComparisonSummary
          items={sortedRoutes as RouteDisplayItem[]}
          destinationCount={validDestinationCount}
          hasStartingPoint={hasStartingPoint}
        />
        <DestinationsSection error={error} />
        <LayoutGroup id="route-results-empty">
          <AnimatePresence initial={false}>
          {pendingDestinationIndexes.map((destinationIndex) => (
            <RouteCardMotion
              key={`pending-route-${destinationIndex}`}
              motionKey={`pending-route-${destinationIndex}`}
            >
              <div className={routeCardMotionStyles.pendingCard}>
                <AddressInput
                  ref={(ref) => setInputRef(destinationIndex, ref)}
                  value={destinations[destinationIndex]?.address ?? ""}
                  placeholder="Введите пункт назначения..."
                  type="destination"
                  index={destinationIndex}
                />
              </div>
            </RouteCardMotion>
          ))}
          </AnimatePresence>
        </LayoutGroup>
        {canClearAll && (
          <Button
            type="button"
            variant="outline"
            className={styles["route-results__clear-all-button"]}
            onClick={handleClearAll}
          >
            <Trash2 className={styles["route-results__clear-all-icon"]} />
            Удалить все
          </Button>
        )}
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
        ) : pendingDestinationIndexes.length === 0 ? (
          <div className={styles["route-results__empty-content"]}>
            <div className={styles["route-results__empty-icon"]}>🗺️</div>
            <p>Добавьте начальную точку и пункты назначения, чтобы увидеть варианты маршрутов</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles["route-results"]}>
      <div className={styles["route-results__header"]}>
        <h3 className={styles["route-results__title"]}>Пункты назначения</h3>
      </div>

      <ComparisonSummary
        items={sortedRoutes as RouteDisplayItem[]}
        destinationCount={validDestinationCount}
        hasStartingPoint={hasStartingPoint}
      />

      <DestinationsSection error={error} />

      {isCalculating && (
        <div className={styles["route-results__soft-loader"]} aria-live="polite">
          <span className={styles["route-results__soft-loader-spinner"]} />
          <span>Обновляем маршруты</span>
        </div>
      )}

      <LayoutGroup id="route-results-list">
        <AnimatePresence initial={false}>
        {pendingDestinationIndexes.map((destinationIndex) => (
          <RouteCardMotion
            key={`pending-route-${destinationIndex}`}
            motionKey={`pending-route-${destinationIndex}`}
          >
            <div className={routeCardMotionStyles.pendingCard}>
              <AddressInput
                ref={(ref) => setInputRef(destinationIndex, ref)}
                value={destinations[destinationIndex]?.address ?? ""}
                placeholder="Введите пункт назначения..."
                type="destination"
                index={destinationIndex}
              />
            </div>
          </RouteCardMotion>
        ))}
        {sortedRoutes.map(({ route, originalIndex, colorIndex, isRecommended }) => (
          <RouteCardMotion key={route.id} motionKey={route.id}>
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
              onRemove={() => handleRemoveByRoute(originalIndex)}
            />
          </RouteCardMotion>
        ))}
        </AnimatePresence>
      </LayoutGroup>
      {canClearAll && (
        <Button
          type="button"
          variant="outline"
          className={styles["route-results__clear-all-button"]}
          onClick={handleClearAll}
        >
          <Trash2 className={styles["route-results__clear-all-icon"]} />
          Удалить все
        </Button>
      )}
    </div>
  );
}
