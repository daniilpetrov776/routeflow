import { useDispatch, useSelector } from "react-redux";
import { MapPin, MousePointer2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { RootState } from "@/store";
import { setMapPlacementMode, type MapPlacementMode } from "@/store/route-slice";
import { MAX_DESTINATIONS } from "@shared/route-limits";
import styles from "./map-placement-mode.module.css";

const modes: Array<{
  mode: MapPlacementMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: "idle", label: "Выкл", icon: MousePointer2 },
  { mode: "start", label: "Начало", icon: MapPin },
  { mode: "destination", label: "Пункт", icon: Plus },
];

const hintByMode: Record<MapPlacementMode, string | null> = {
  idle: null,
  start: "Кликните на карте, чтобы указать начальную точку.",
  destination: "Кликните на карте, чтобы добавить пункт назначения.",
};

export function MapPlacementMode() {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const mapPlacementMode = useSelector((state: RootState) => state.route.mapPlacementMode);
  const destinationsCount = useSelector((state: RootState) => state.route.destinations.length);
  const isDestinationLimitReached = destinationsCount >= MAX_DESTINATIONS;
  const hint = hintByMode[mapPlacementMode];

  if (isMobile) {
    return null;
  }

  const handleModeChange = (mode: MapPlacementMode) => {
    dispatch(setMapPlacementMode(mode));
  };

  return (
    <div className={styles["map-placement-mode"]}>
      <div
        className={styles["map-placement-mode__group"]}
        role="radiogroup"
        aria-label="Режим указания точек на карте"
      >
        {modes.map(({ mode, label, icon: Icon }) => {
          const isActive = mapPlacementMode === mode;
          const isDisabled = mode === "destination" && isDestinationLimitReached;

          return (
            <Button
              key={mode}
              type="button"
              variant="outline"
              size="sm"
              role="radio"
              aria-checked={isActive}
              aria-pressed={isActive}
              disabled={isDisabled}
              onClick={() => handleModeChange(mode)}
              className={`${styles["map-placement-mode__button"]} ${
                isActive
                  ? styles["map-placement-mode__button--active"]
                  : styles["map-placement-mode__button--inactive"]
              }`}
            >
              <Icon className={styles["map-placement-mode__icon"]} />
              <span className={styles["map-placement-mode__label"]}>{label}</span>
            </Button>
          );
        })}
      </div>

      {hint && <div className={styles["map-placement-mode__hint"]}>{hint}</div>}
    </div>
  );
}
