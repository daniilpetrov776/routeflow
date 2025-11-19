import { useState, useRef, useCallback } from "react";
import { RouteSidebarHandle } from "./route-sidebar-handle";
import { RouteSidebarContent } from "./route-sidebar-content";
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
      {isMobile && (
        <RouteSidebarHandle isOpen={isOpen} onToggle={handleToggle} />
      )}

      <RouteSidebarContent
        headerRef={headerRef}
        isMobile={isMobile}
        onToggle={handleToggle}
      />
    </div>
  );
}
