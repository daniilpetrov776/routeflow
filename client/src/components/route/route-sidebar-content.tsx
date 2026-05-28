import { useSelector } from "react-redux";
import { LayoutGroup, motion } from "framer-motion";
import { RootState } from "@/store";
import { AddressInput } from "../address/address-input";
import { RouteResults } from "./route-results";
import { SidebarHeader } from "../sidebar-header";
import { RouteSummary } from "./route-summary";
import { TransportModeSelector } from "./transport-mode-selector";
import styles from "./route-sidebar.module.css";

interface RouteSidebarContentProps {
  headerRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
  onToggle: () => void;
}

/**
 * Содержимое сайдбара - все элементы формы и результатов
 */
export function RouteSidebarContent({
  headerRef,
  isMobile,
  onToggle,
}: RouteSidebarContentProps) {
  const {
    startingPoint,
    routes,
    error,
  } = useSelector((state: RootState) => state.route);

  return (
    <>
      <SidebarHeader
        ref={headerRef}
        isMobile={isMobile}
        onToggle={onToggle}
      />

      <LayoutGroup id="route-sidebar-layout">
        {/* Address Inputs */}
        <div className={styles["route-sidebar__inputs"]}>
          <motion.div layout="position" transition={{ duration: 0.24, ease: "easeOut" }}>
            <AddressInput
              label="Начальная точка"
              value={startingPoint?.address || ''}
              placeholder="Введите начальный адрес..."
              type="start"
            />
          </motion.div>

          <motion.div
            layout="position"
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={styles["route-sidebar__movement"]}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["route-sidebar__section-label"]}>
              Способ передвижения
            </div>
            <TransportModeSelector />
          </motion.div>
        </div>

        {/* Route Results */}
        <motion.div
          layout="position"
          transition={{ duration: 0.24, ease: "easeOut" }}
          className={styles["route-sidebar__results"]}
        >
          <RouteResults error={error}/>
        </motion.div>

        <motion.div layout="position" transition={{ duration: 0.24, ease: "easeOut" }}>
          <RouteSummary routes={routes} />
        </motion.div>
      </LayoutGroup>
    </>
  );
}

