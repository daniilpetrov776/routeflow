import styles from "./route-sidebar.module.css";

interface RouteSidebarHandleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Handle для мобильных устройств - кнопка для открытия/закрытия сайдбара
 */
export function RouteSidebarHandle({ isOpen, onToggle }: RouteSidebarHandleProps) {
  return (
    <div
      className={styles["route-sidebar__handle"]}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
    />
  );
}

