import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { addDestination } from "@/store/route-slice";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MOSCOW_CENTER } from "@/lib/map-constants";
import { MAX_DESTINATIONS } from "@shared/route-limits";
import styles from "./route-sidebar.module.css";

interface DestinationsSectionProps {
  error?: string | null;
}

export function DestinationsSection({
  error,
}: DestinationsSectionProps) {
  const dispatch = useDispatch();
  const { destinations, routes } = useSelector((state: RootState) => state.route);
  const isAddDisabled = destinations.length >= MAX_DESTINATIONS;
  const showLimitHint = routes.length >= MAX_DESTINATIONS;

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
      <motion.div layout="position" transition={{ duration: 0.24, ease: "easeOut" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddDestination}
          disabled={isAddDisabled}
          className={styles["route-sidebar__destinations-add-button"]}
        >
          <Plus className={styles["route-sidebar__destinations-add-icon"]} />
          Добавить
        </Button>
      </motion.div>

      {showLimitHint && (
        <div className={styles["route-sidebar__destinations-limit-hint"]}>
          Достигнут лимит: {MAX_DESTINATIONS} пунктов
        </div>
      )}

      {error && (
        <div className={styles["route-sidebar__error"]}>{error}</div>
      )}
    </div>
  );
}
