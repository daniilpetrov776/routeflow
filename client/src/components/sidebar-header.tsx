import { forwardRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTheme } from "@/store/theme-slice";
import { Button } from "@/components/ui/button";
import { TransportModeSelector } from "./route/transport-mode-selector";
import { PersistRoutesToggle } from "./route/persist-routes-toggle";
import { Sun, Moon, Monitor } from "lucide-react";
import styles from "./route/route-sidebar.module.css";

interface SidebarHeaderProps {
  isMobile?: boolean;
  onToggle?: () => void;
}

export const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ isMobile, onToggle }, ref) => {
    const dispatch = useDispatch();
    const { theme } = useSelector((state: RootState) => state.theme);

  const handleThemeToggle = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    dispatch(setTheme(nextTheme));
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className={styles["route-sidebar__theme-icon"]} />;
      case 'dark':
        return <Moon className={styles["route-sidebar__theme-icon"]} />;
      default:
        return <Monitor className={styles["route-sidebar__theme-icon"]} />;
    }
  };

    return (
      <div
        ref={ref}
        className={styles["route-sidebar__header"]}
        onClick={isMobile ? onToggle : undefined}
        style={isMobile ? { cursor: 'pointer' } : undefined}
      >
        <div className={styles["route-sidebar__header-top"]}>
          <h1 className={styles["route-sidebar__title"]}>
            Планировщик маршрутов
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleThemeToggle();
            }}
            className={styles["route-sidebar__theme-button"]}
          >
            {getThemeIcon()}
          </Button>
        </div>

        {/* Селектор режимов транспорта - всегда видим на мобильных */}
        <div
          className={styles["route-sidebar__transport-selector"]}
          onClick={(e) => e.stopPropagation()}
        >
          <TransportModeSelector />
        </div>

        {/* Переключатель сохранения маршрутов */}
        <div
          className={styles["route-sidebar__persist-section"]}
          onClick={(e) => e.stopPropagation()}
        >
          <PersistRoutesToggle />
        </div>
      </div>
    );
  }
);

SidebarHeader.displayName = "SidebarHeader";

