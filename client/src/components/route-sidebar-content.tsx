import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { AddressInput } from "./address-input";
import { RouteResults } from "./route-results";
import { SidebarHeader } from "./sidebar-header";
import { DestinationsSection } from "./destinations-section";
import { RouteSummary } from "./route-summary";
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
          icon="📍"
          value={startingPoint?.address || ''}
          placeholder="Введите начальный адрес..."
          type="start"
        />

        <DestinationsSection destinations={destinations} error={error} />
      </div>

      {/* Route Results */}
      <div className={styles["route-sidebar__results"]}>
        <RouteResults />
      </div>

      <RouteSummary routes={routes} />
    </>
  );
}

