import { useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { AddressInput } from "./address-input";
import { RouteResults } from "./route-results";
import { SidebarHeader } from "./sidebar-header";
import { DestinationsSection } from "./destinations-section";
import { RouteSummary } from "./route-summary";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeHandler } from "@/hooks/useSwipeHandler";
import styles from "./route-sidebar.module.css";

interface RouteSidebarProps {
  onOpenChange?: (open: boolean) => void;
}

export function RouteSidebar({ onOpenChange }: RouteSidebarProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const {
    startingPoint,
    destinations,
    routes,
    error,
  } = useSelector((state: RootState) => state.route);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;

      // При закрытии sidebar сбрасываем позицию скролла в начало
      if (!newState && sidebarRef.current) {
        sidebarRef.current.scrollTop = 0;
      }

      // Вызываем onOpenChange асинхронно, чтобы избежать обновления во время рендеринга
      setTimeout(() => {
        onOpenChange?.(newState);
      }, 0);
      return newState;
    });
  }, [onOpenChange]);

  // Используем хук для обработки свайпов
  useSwipeHandler({
    isMobile,
    isOpen,
    sidebarRef,
    headerRef,
    onToggle: handleToggle,
  });


  const sidebarClassName = isMobile 
    ? `${styles["route-sidebar"]} ${isOpen ? styles["route-sidebar--open"] : ""}`
    : styles["route-sidebar"];

  return (
    <div 
      ref={sidebarRef}
      className={sidebarClassName}
    >
      {/* Handle для мобильных устройств */}
      {isMobile && (
        <div 
          className={styles["route-sidebar__handle"]}
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        />
      )}

      <SidebarHeader
        ref={headerRef}
        isMobile={isMobile}
        onToggle={handleToggle}
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
    </div>
  );
}
