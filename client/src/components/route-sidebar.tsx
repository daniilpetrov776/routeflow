import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTheme } from "@/store/theme-slice";
import { addDestination, } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { AddressInput } from "./address-input";
import { TransportModeSelector } from "./transport-mode-selector";
import { RouteResults } from "./route-results";
import { Sun, Moon, Monitor, Plus, } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import styles from "./route-sidebar.module.css";

interface RouteSidebarProps {
  onOpenChange?: (open: boolean) => void;
}

export function RouteSidebar({ onOpenChange }: RouteSidebarProps) {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const { 
    startingPoint, 
    destinations, 
    routes,
    error 
  } = useSelector((state: RootState) => state.route);
  const { theme } = useSelector((state: RootState) => state.theme);

  // Автоматически открываем sidebar на мобильных при наличии маршрутов
  useEffect(() => {
    if (isMobile && routes.length > 0 && !isOpen) {
      setIsOpen(true);
      // Вызываем onOpenChange асинхронно, чтобы избежать обновления во время рендеринга
      setTimeout(() => {
        onOpenChange?.(true);
      }, 0);
    }
  }, [isMobile, routes.length, isOpen, onOpenChange]);

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

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
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

  // Обработчики для свайпа с использованием addEventListener для non-passive событий
  useEffect(() => {
    if (!isMobile || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    let startY = 0;
    let startTime = 0;
    let isScrollingInternal = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Проверяем, не кликнули ли на кнопку
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      
      // Если sidebar закрыт, свайп работает только в области header/handle
      if (!isOpen) {
        const header = headerRef.current;
        if (header) {
          const headerRect = header.getBoundingClientRect();
          const touchY = e.touches[0].clientY;
          // Проверяем, что касание в области header (включая handle и селектор транспорта)
          if (touchY < headerRect.top || touchY > headerRect.bottom + 20) {
            return; // Не обрабатываем свайп вне области header
          }
        }
      }
      
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isScrollingInternal = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Если sidebar закрыт, свайп работает только в области header/handle
      if (!isOpen) {
        const header = headerRef.current;
        if (header) {
          const headerRect = header.getBoundingClientRect();
          const touchY = e.touches[0].clientY;
          if (touchY < headerRect.top || touchY > headerRect.bottom + 20) {
            return; // Не обрабатываем свайп вне области header
          }
        }
      }
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Определяем, это скролл или свайп
      if (Math.abs(deltaY) > 10) {
        const isAtTop = sidebar.scrollTop === 0;
        const isAtBottom = sidebar.scrollHeight - sidebar.scrollTop <= sidebar.clientHeight + 1;
        
        // Если скроллим внутри контента, не обрабатываем как свайп
        if (!isAtTop && !isAtBottom) {
          isScrollingInternal = true;
          return;
        }
        
        // Свайп работает только когда sidebar открыт и мы вверху
        if (isAtTop && isOpen) {
          if (deltaY > 0) {
            // Тянем вниз при открытом sidebar - закрываем
            e.preventDefault();
          }
        }
        // Или когда sidebar закрыт и мы в области header
        else if (!isOpen) {
          if (deltaY < 0) {
            // Тянем вверх при закрытом sidebar - открываем
            e.preventDefault();
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrollingInternal) return;
      
      // Проверяем, не кликнули ли на кнопку
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      
      // Если sidebar закрыт, свайп работает только в области header/handle
      if (!isOpen) {
        const header = headerRef.current;
        if (header) {
          const headerRect = header.getBoundingClientRect();
          const touchY = e.changedTouches[0].clientY;
          if (touchY < headerRect.top || touchY > headerRect.bottom + 20) {
            return; // Не обрабатываем свайп вне области header
          }
        }
      }
      
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - startY;
      const deltaTime = Date.now() - startTime;
      const minSwipeDistance = 50;
      const maxSwipeTime = 300;

      // Проверяем, что это быстрый свайп
      if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
        const isAtTop = sidebar.scrollTop === 0;
        
        if (isOpen && isAtTop) {
          // Свайп вниз - закрываем (только когда открыт и вверху)
          if (deltaY > 0) {
            // Сбрасываем позицию скролла перед закрытием
            sidebar.scrollTop = 0;
            handleToggle();
          }
        } else if (!isOpen) {
          // Свайп вверх - открываем (только когда закрыт и в области header)
          if (deltaY < 0) {
            handleToggle();
          }
        }
      }
    };

    // Добавляем обработчики с passive: false для возможности preventDefault
    sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
    sidebar.addEventListener('touchmove', handleTouchMove, { passive: false });
    sidebar.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, handleToggle]);

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

      {/* Header - всегда видим на мобильных, вся область кликабельна */}
      <div 
        ref={headerRef}
        className={styles["route-sidebar__header"]}
        onClick={isMobile ? handleToggle : undefined}
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
