import { useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
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
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const prevLengthRef = useRef(destinations.length);

  const handleAddDestination = () => {
    dispatch(
      addDestination({
        address: '',
        coordinates: MOSCOW_CENTER, // Moscow center - won't trigger map camera jump until geocoded
      })
    );
  };

  // Устанавливаем фокус на последний input только когда добавляется новое поле
  useEffect(() => {
    // Если длина массива увеличилась - значит добавили новое поле
    if (destinations.length > prevLengthRef.current) {
      const lastIndex = destinations.length - 1;
      const lastInput = inputRefs.current.get(lastIndex);
      
      // Устанавливаем фокус только если поле пустое (новое)
      if (lastInput && !destinations[lastIndex]?.address) {
        // Небольшая задержка для гарантии, что DOM обновился
        setTimeout(() => {
          lastInput.focus();
        }, 0);
      }
    }
    
    prevLengthRef.current = destinations.length;
  }, [destinations.length, destinations]);

  const setInputRef = (index: number, ref: HTMLInputElement | null) => {
    if (ref) {
      inputRefs.current.set(index, ref);
    } else {
      inputRefs.current.delete(index);
    }
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
            ref={(ref) => setInputRef(index, ref)}
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

