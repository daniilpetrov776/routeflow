import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { AddressInput } from "../address/address-input";
import { RouteResults } from "./route-results";
import { SidebarHeader } from "../sidebar-header";
import { DestinationsSection } from "./destinations-section";
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
    destinations,
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

      {/* Address Inputs */}
      <div className={styles["route-sidebar__inputs"]}>
        <AddressInput
          label="Начальная точка"
          value={startingPoint?.address || ''}
          placeholder="Введите начальный адрес..."
          type="start"
        />

        <DestinationsSection destinations={destinations} error={error} />

        <div
          className={styles["route-sidebar__movement"]}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles["route-sidebar__section-label"]}>
            Способ передвижения
          </div>
          <TransportModeSelector />
        </div>
      </div>

      {/* Route Results */}
      <div className={styles["route-sidebar__results"]}>
        <RouteResults />
      </div>

      <RouteSummary routes={routes} />
    </>
  );
}

