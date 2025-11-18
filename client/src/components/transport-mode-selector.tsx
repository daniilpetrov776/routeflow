import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTransportMode, clearRoutes } from "@/store/route-slice";
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

  const handleModeChange = (mode: TransportMode) => {
    dispatch(setTransportMode(mode));
    dispatch(clearRoutes());
  };

  return (
    <div className={styles["transport-mode-selector"]}>
      {transportModes.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          variant={transportMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange(mode)}
          className={`${styles["transport-mode-selector__button"]} ${transportMode === mode 
            ? styles["transport-mode-selector__button--active"] 
            : styles["transport-mode-selector__button--inactive"]
          }`}
        >
          <Icon className={styles["transport-mode-selector__icon"]} />
          <span className={styles["transport-mode-selector__label"]}>{label}</span>
        </Button>
      ))}
    </div>
  );
}
