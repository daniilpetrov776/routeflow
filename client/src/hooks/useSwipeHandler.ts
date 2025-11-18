import { useEffect, useRef } from "react";

interface UseSwipeHandlerOptions {
  isMobile: boolean;
  isOpen: boolean;
  sidebarRef: React.RefObject<HTMLDivElement>;
  headerRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
}

/**
 * Хук для обработки свайпов на мобильных устройствах
 */
export function useSwipeHandler({
  isMobile,
  isOpen,
  sidebarRef,
  headerRef,
  onToggle,
}: UseSwipeHandlerOptions) {
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isScrollingInternalRef = useRef(false);

  useEffect(() => {
    if (!isMobile || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;

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

      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      isScrollingInternalRef.current = false;
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
      const deltaY = currentY - startYRef.current;

      // Определяем, это скролл или свайп
      if (Math.abs(deltaY) > 10) {
        const isAtTop = sidebar.scrollTop === 0;
        const isAtBottom =
          sidebar.scrollHeight - sidebar.scrollTop <= sidebar.clientHeight + 1;

        // Если скроллим внутри контента, не обрабатываем как свайп
        if (!isAtTop && !isAtBottom) {
          isScrollingInternalRef.current = true;
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
      if (isScrollingInternalRef.current) return;

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
      const deltaY = touchEndY - startYRef.current;
      const deltaTime = Date.now() - startTimeRef.current;
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
            onToggle();
          }
        } else if (!isOpen) {
          // Свайп вверх - открываем (только когда закрыт и в области header)
          if (deltaY < 0) {
            onToggle();
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
  }, [isMobile, isOpen, sidebarRef, headerRef, onToggle]);
}

