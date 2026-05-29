import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MapPin, Plus, X } from "lucide-react";
import { MAX_DESTINATIONS } from "@shared/route-limits";
import type { Coordinates } from "@/types/yandex-maps";
import styles from "./map-placement-context-menu.module.css";

export interface MapPlacementContextMenuAnchor {
  x: number;
  y: number;
}

interface MapPlacementContextMenuProps {
  open: boolean;
  anchor: MapPlacementContextMenuAnchor | null;
  coords: Coordinates | null;
  destinationsCount: number;
  isBusy: boolean;
  onSelectStart: () => void;
  onSelectDestination: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 176;
const MENU_HEIGHT = 168;
const VIEWPORT_PADDING = 12;

function clampMenuPosition(anchor: MapPlacementContextMenuAnchor): React.CSSProperties {
  const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING;
  const maxTop = window.innerHeight - MENU_HEIGHT - VIEWPORT_PADDING;

  return {
    left: Math.min(Math.max(anchor.x, VIEWPORT_PADDING), maxLeft),
    top: Math.min(Math.max(anchor.y, VIEWPORT_PADDING), maxTop),
  };
}

export function MapPlacementContextMenu({
  open,
  anchor,
  coords,
  destinationsCount,
  isBusy,
  onSelectStart,
  onSelectDestination,
  onClose,
}: MapPlacementContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isDestinationLimitReached = destinationsCount >= MAX_DESTINATIONS;

  const menuStyle = useMemo(() => {
    if (!anchor) {
      return undefined;
    }

    return clampMenuPosition(anchor);
  }, [anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !anchor || !coords || !menuStyle) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        className={styles["map-placement-context-menu__backdrop"]}
        aria-label="Закрыть меню"
        onClick={onClose}
      />

      <div
        ref={menuRef}
        className={styles["map-placement-context-menu"]}
        style={menuStyle}
        role="menu"
        aria-label="Указать точку на карте"
      >
        <button
          type="button"
          role="menuitem"
          className={styles["map-placement-context-menu__item"]}
          disabled={isBusy}
          onClick={onSelectStart}
        >
          <MapPin className={styles["map-placement-context-menu__icon"]} />
          Начальная точка
        </button>

        <button
          type="button"
          role="menuitem"
          className={styles["map-placement-context-menu__item"]}
          disabled={isBusy || isDestinationLimitReached}
          onClick={onSelectDestination}
        >
          <Plus className={styles["map-placement-context-menu__icon"]} />
          Добавить пункт
        </button>

        {isDestinationLimitReached && (
          <div className={styles["map-placement-context-menu__hint"]}>
            Достигнут лимит пунктов ({MAX_DESTINATIONS}).
          </div>
        )}

        <button
          type="button"
          role="menuitem"
          className={`${styles["map-placement-context-menu__item"]} ${styles["map-placement-context-menu__item--cancel"]}`}
          onClick={onClose}
        >
          <X className={styles["map-placement-context-menu__icon"]} />
          Отмена
        </button>
      </div>
    </>,
    document.body
  );
}
