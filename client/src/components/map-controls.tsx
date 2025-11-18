import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair } from "lucide-react";
import styles from "./map-container.module.css";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onCenter,
}: MapControlsProps) {
  return (
    <div className={styles["map-container__controls"]}>
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomIn}
        className={styles["map-container__control-button"]}
      >
        <Plus className={styles["map-container__control-icon"]} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomOut}
        className={styles["map-container__control-button"]}
      >
        <Minus className={styles["map-container__control-icon"]} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onCenter}
        className={styles["map-container__control-button"]}
      >
        <Crosshair className={styles["map-container__control-icon"]} />
      </Button>
    </div>
  );
}

