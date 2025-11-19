import { useDispatch } from "react-redux";
import { addDestination } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { AddressInput } from "./address-input";
import { Plus } from "lucide-react";
import { MOSCOW_CENTER } from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import styles from "./route-sidebar.module.css";

interface DestinationsSectionProps {
  destinations: AddressPoint[];
  error?: string | null;
}

export function DestinationsSection({
  destinations,
  error,
}: DestinationsSectionProps) {
  const dispatch = useDispatch();

  const handleAddDestination = () => {
    dispatch(
      addDestination({
        address: '',
        coordinates: MOSCOW_CENTER, // Moscow center - won't trigger map camera jump until geocoded
      })
    );
  };

  return (
    <div className={styles["route-sidebar__destinations"]}>
      <div className={styles["route-sidebar__destinations-header"]}>
        <label className={styles["route-sidebar__destinations-label"]}>
          🏁 Пункты назначения
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddDestination}
          className={styles["route-sidebar__destinations-add-button"]}
        >
          <Plus className={styles["route-sidebar__destinations-add-icon"]} />
          Добавить
        </Button>
      </div>

      {destinations.map((destination, index) => (
        <div
          key={index}
          className={styles["route-sidebar__destinations-item"]}
        >
          <AddressInput
            value={destination.address}
            placeholder="Введите адрес назначения..."
            type="destination"
            index={index}
          />
        </div>
      ))}

      {error && (
        <div className={styles["route-sidebar__error"]}>{error}</div>
      )}
    </div>
  );
}

