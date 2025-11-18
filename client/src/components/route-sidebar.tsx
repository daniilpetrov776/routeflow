import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTheme } from "@/store/theme-slice";
import { addDestination, } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { AddressInput } from "./address-input";
import { TransportModeSelector } from "./transport-mode-selector";
import { RouteResults } from "./route-results";
import { Sun, Moon, Monitor, Plus, } from "lucide-react";
import styles from "./route-sidebar.module.css";

export function RouteSidebar() {
  const dispatch = useDispatch();
  const { 
    startingPoint, 
    destinations, 
    routes,
    error 
  } = useSelector((state: RootState) => state.route);
  const { theme } = useSelector((state: RootState) => state.theme);

  const handleThemeToggle = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    dispatch(setTheme(nextTheme));
  };

  const handleAddDestination = () => {
    dispatch(addDestination({
      address: '',
      coordinates: [55.7558, 37.6176] // Moscow center - won't trigger map camera jump until geocoded
    }));
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className={styles["route-sidebar__theme-icon"]} />;
      case 'dark': return <Moon className={styles["route-sidebar__theme-icon"]} />;
      default: return <Monitor className={styles["route-sidebar__theme-icon"]} />;
    }
  };

  return (
    <div className={styles["route-sidebar"]}>
      {/* Header */}
      <div className={styles["route-sidebar__header"]}>
        <div className={styles["route-sidebar__header-top"]}>
          <h1 className={styles["route-sidebar__title"]}>Планировщик маршрутов</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className={styles["route-sidebar__theme-button"]}
          >
            {getThemeIcon()}
          </Button>
        </div>
        
        <TransportModeSelector />
      </div>

      {/* Address Inputs */}
      <div className={styles["route-sidebar__inputs"]}>
        <AddressInput
          label="Начальная точка"
          icon="📍"
          value={startingPoint?.address || ''}
          placeholder="Введите начальный адрес..."
          type="start"
        />

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
            <div key={index} className={styles["route-sidebar__destinations-item"]}>
              <AddressInput
                value={destination.address}
                placeholder="Введите адрес назначения..."
                type="destination"
                index={index}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className={styles["route-sidebar__error"]}>
            {error}
          </div>
        )}
      </div>

      {/* Route Results */}
      <div className={styles["route-sidebar__results"]}>
        <RouteResults />
      </div>

      {/* Summary Statistics */}
      {routes.length > 0 && (
        <div className={styles["route-sidebar__summary"]}>
          <h4 className={styles["route-sidebar__summary-title"]}>Сводная статистика</h4>
          <div className={styles["route-sidebar__summary-grid"]}>
            <div className={styles["route-sidebar__summary-item"]}>
              <div className={styles["route-sidebar__summary-value"]}>{routes.length}</div>
              <div className={styles["route-sidebar__summary-label"]}>Найдено маршрутов</div>
            </div>
            <div className={styles["route-sidebar__summary-item"]}>
              <div className={styles["route-sidebar__summary-value--green"]}>
                {Math.min(...routes.map(r => Math.round(r.duration / 60)))}м
              </div>
              <div className={styles["route-sidebar__summary-label"]}>Лучшее время</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
