import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, Navigation, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration } from "@/lib/route";
import { sanitizeText } from "@/lib/sanitize";
import type { AlongRouteCandidate } from "@/lib/along-route/types";
import type { useAlongRoute } from "@/hooks/useAlongRoute";
import styles from "./along-route-panel.module.css";

type AlongRouteController = ReturnType<typeof useAlongRoute>;

interface AlongRoutePanelProps {
  controller: AlongRouteController;
}

function formatDeviation(meters: number): string {
  if (meters < 1000) {
    return `~${Math.round(meters / 10) * 10} м от маршрута`;
  }
  return `~${(meters / 1000).toFixed(1)} км от маршрута`;
}

function formatDelta(seconds: number, meters: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const km = meters / 1000;
  const distancePart = meters < 1000 ? `${Math.max(0, Math.round(meters))} м` : `${km.toFixed(1)} км`;
  return `+${minutes} мин · +${distancePart}`;
}

export function AlongRoutePanel({ controller }: AlongRoutePanelProps) {
  const {
    isOpen,
    activeRoute,
    activeWaypoints,
    searchText,
    candidates,
    isSearching,
    searchError,
    selectedKey,
    detour,
    isComputingDetour,
    close,
    setSearchText,
    selectCandidate,
    addCandidate,
    removeWaypoint,
    candidateKey,
  } = controller;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen || !activeRoute) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        className={styles["along-route__backdrop"]}
        aria-label="Закрыть"
        onClick={close}
      />

      <div
        className={styles["along-route__panel"]}
        role="dialog"
        aria-label="Поиск организаций по пути"
      >
        <div className={styles["along-route__header"]}>
          <div>
            <div className={styles["along-route__title"]}>По пути</div>
            <div className={styles["along-route__subtitle"]}>
              {sanitizeText(activeRoute.destination.address)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={styles["along-route__close"]}
            aria-label="Закрыть"
            onClick={close}
          >
            <X className={styles["along-route__icon"]} />
          </Button>
        </div>

        <div className={styles["along-route__search"]}>
          <Search className={styles["along-route__search-icon"]} />
          <input
            className={styles["along-route__search-input"]}
            type="text"
            value={searchText}
            placeholder="Например: КФС, заправка, аптека…"
            autoFocus
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        {activeWaypoints.length > 0 && (
          <div className={styles["along-route__waypoints"]}>
            <div className={styles["along-route__waypoints-title"]}>Заезды в маршруте</div>
            {activeWaypoints.map((waypoint, waypointIndex) => (
              <div key={`${waypoint.address}-${waypointIndex}`} className={styles["along-route__waypoint"]}>
                <MapPin className={styles["along-route__icon"]} />
                <span className={styles["along-route__waypoint-name"]}>
                  {sanitizeText(waypoint.address)}
                </span>
                <button
                  type="button"
                  className={styles["along-route__icon-button"]}
                  aria-label="Убрать заезд"
                  onClick={() => removeWaypoint(waypointIndex)}
                >
                  <X className={styles["along-route__icon"]} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles["along-route__body"]}>
          {isSearching ? (
            <div className={styles["along-route__status"]}>
              <span className={styles["along-route__spinner"]} />
              Ищем организации рядом с маршрутом…
            </div>
          ) : searchError ? (
            <div className={styles["along-route__status"]}>{searchError}</div>
          ) : candidates.length === 0 ? (
            <div className={styles["along-route__status"]}>
              Введите название организации, чтобы найти её по пути.
            </div>
          ) : (
            candidates.map((candidate: AlongRouteCandidate) => {
              const key = candidateKey(candidate);
              const isSelected = key === selectedKey;

              return (
                <div
                  key={key}
                  className={`${styles["along-route__item"]} ${
                    isSelected ? styles["along-route__item--selected"] : ""
                  }`}
                  onClick={() => {
                    if (!isSelected) {
                      void selectCandidate(candidate);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void selectCandidate(candidate);
                    }
                  }}
                >
                  <div className={styles["along-route__item-header"]}>
                    <span className={styles["along-route__item-name"]}>
                      {sanitizeText(candidate.name)}
                    </span>
                    <span className={styles["along-route__item-deviation"]}>
                      {formatDeviation(candidate.deviationMeters)}
                    </span>
                  </div>
                  {candidate.fullAddress && (
                    <div className={styles["along-route__item-address"]}>
                      {sanitizeText(candidate.fullAddress)}
                    </div>
                  )}

                  {candidate.progress >= 0 &&
                    candidate.progress <= 1 &&
                    candidate.distanceFromStartMeters + candidate.distanceFromEndMeters > 0 && (
                      <div className={styles["along-route__track-wrap"]}>
                        <div className={styles["along-route__track-ends"]}>
                          <span>Старт</span>
                          <span>Финиш</span>
                        </div>
                        <div className={styles["along-route__track"]}>
                          <div className={styles["along-route__track-rail"]} />
                          <span
                            className={styles["along-route__track-marker"]}
                            style={{ left: `${Math.round(candidate.progress * 100)}%` }}
                            role="img"
                            aria-label={`По пути: ${Math.round(candidate.progress * 100)}% от начала`}
                          />
                        </div>
                        <div className={styles["along-route__progress-metrics"]}>
                          {formatDistance(candidate.distanceFromStartMeters)} от начала ·{" "}
                          {formatDistance(candidate.distanceFromEndMeters)} до конца
                        </div>
                      </div>
                    )}

                  {isSelected && (
                    <div className={styles["along-route__detour"]}>
                      {isComputingDetour ? (
                        <span className={styles["along-route__detour-unavailable"]}>
                          <Loader2
                            className={`${styles["along-route__icon"]} inline animate-spin`}
                          />{" "}
                          Считаем заезд…
                        </span>
                      ) : detour ? (
                        <div className={styles["along-route__detour-metrics"]}>
                          <Navigation className={styles["along-route__icon"]} />
                          <span>{formatDelta(detour.durationDelta, detour.distanceDelta)}</span>
                          <span className={styles["along-route__detour-delta"]}>
                            (итого {formatDuration(detour.duration)} · {formatDistance(detour.distance)})
                          </span>
                        </div>
                      ) : (
                        <span className={styles["along-route__detour-unavailable"]}>
                          Не удалось рассчитать заезд
                        </span>
                      )}

                      <button
                        type="button"
                        className={styles["along-route__add-button"]}
                        disabled={isComputingDetour}
                        onClick={(event) => {
                          event.stopPropagation();
                          addCandidate(candidate);
                        }}
                      >
                        <Plus className={styles["along-route__icon"]} />
                        В маршрут
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
