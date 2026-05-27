import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTransportMode } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { Footprints, Bike, Bus, Car } from "lucide-react";
import type { TransportMode } from "@/store/route-slice";
import styles from "./transport-mode-selector.module.css";

const transportModes: Array<{
  mode: TransportMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'walking', label: 'Пешком', icon: Footprints },
  { mode: 'cycling', label: 'Велосипед', icon: Bike },
  { mode: 'transit', label: 'Общественный транспорт', icon: Bus },
  { mode: 'driving', label: 'Автомобиль', icon: Car },
];

export function TransportModeSelector() {
  const dispatch = useDispatch();
  const { transportMode } = useSelector((state: RootState) => state.route);

  const handleModeChange = (mode: TransportMode, e?: React.MouseEvent) => {
    // Предотвращаем всплытие события, чтобы не открывать сайдбар на мобильных
    if (e) {
      e.stopPropagation();
    }
    dispatch(setTransportMode(mode));
  };

  return (
    <div className={styles["transport-mode-selector"]}>
      {transportModes.map(({ mode, label, icon: Icon }) => {
        const isActive = transportMode === mode;

        return (
          <Button
            key={mode}
            variant="outline"
            size="sm"
            aria-pressed={isActive}
            onClick={(e) => handleModeChange(mode, e)}
            className={`${styles["transport-mode-selector__button"]} ${isActive
              ? styles["transport-mode-selector__button--active"]
              : styles["transport-mode-selector__button--inactive"]
            }`}
          >
            <Icon className={styles["transport-mode-selector__icon"]} />
            <span className={styles["transport-mode-selector__label"]}>{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
