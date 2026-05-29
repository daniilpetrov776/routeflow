import {
  coordinatesToPixels,
  getClickCoordinates,
} from "@/lib/balloon/balloon-coordinates";
import { getMapContainerElement } from "@/lib/balloon/balloon-dom";
import { isGeoObjectTarget } from "@/lib/map-container/map-click-placement";
import type { Coordinates, YandexEvent, YandexEventManager, YandexMap } from "@/types/yandex-maps";

type MapWithEvents = YandexMap & { events: YandexEventManager };

const LONG_PRESS_DELAY_MS = 500;
const MOVE_THRESHOLD_PX = 12;
const MOVE_THRESHOLD_TOUCH_PX = 24;

export interface MapLongPressAnchor {
  x: number;
  y: number;
}

export interface MapLongPressPayload {
  coords: Coordinates;
  anchor: MapLongPressAnchor;
}

export interface MapLongPressOptions {
  onLongPress: (payload: MapLongPressPayload) => void;
  shouldSkipTarget?: (target: unknown) => boolean;
}

type PendingPress = {
  anchor: MapLongPressAnchor;
  coords: Coordinates;
};

function pagePointToCoords(map: YandexMap, clientX: number, clientY: number): Coordinates | null {
  try {
    const mapAny = map as {
      converter?: { pageToGlobal?: (point: number[]) => number[] };
      options?: { get?: (key: string) => unknown };
      getZoom?: () => number;
    };

    const globalPixel = mapAny.converter?.pageToGlobal?.([clientX, clientY]);
    const projection = mapAny.options?.get?.("projection") as
      | { fromGlobalPixels?: (point: number[], zoom: number) => number[] }
      | undefined;
    const zoom = mapAny.getZoom?.() ?? 10;

    if (globalPixel && projection?.fromGlobalPixels) {
      const geo = projection.fromGlobalPixels(globalPixel, zoom);
      if (Array.isArray(geo) && geo.length >= 2) {
        return [geo[0], geo[1]];
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function readPointerFromDomLike(domLike: unknown): MapLongPressAnchor | null {
  if (!domLike || typeof domLike !== "object") {
    return null;
  }

  const candidate = domLike as {
    clientX?: number;
    clientY?: number;
    get?: (key: string) => unknown;
    originalEvent?: Event;
    touches?: TouchList;
    changedTouches?: TouchList;
  };

  if (typeof candidate.get === "function") {
    const clientX = candidate.get("clientX");
    const clientY = candidate.get("clientY");
    if (typeof clientX === "number" && typeof clientY === "number") {
      return { x: clientX, y: clientY };
    }
  }

  if (candidate.touches && candidate.touches.length > 0) {
    return {
      x: candidate.touches[0].clientX,
      y: candidate.touches[0].clientY,
    };
  }

  if (candidate.changedTouches && candidate.changedTouches.length > 0) {
    return {
      x: candidate.changedTouches[0].clientX,
      y: candidate.changedTouches[0].clientY,
    };
  }

  if (typeof candidate.clientX === "number" && typeof candidate.clientY === "number") {
    return { x: candidate.clientX, y: candidate.clientY };
  }

  if (candidate.originalEvent) {
    return readPointerFromDomLike(candidate.originalEvent);
  }

  return null;
}

function getAnchorFromMapEvent(
  event: YandexEvent | undefined,
  map: YandexMap,
  fallbackCoords: Coordinates | null
): MapLongPressAnchor | null {
  try {
    const originalEvent = event?.get?.("originalEvent");
    const fromOriginal = readPointerFromDomLike(originalEvent);
    if (fromOriginal) {
      return fromOriginal;
    }

    const domEvent = event?.get?.("domEvent");
    const fromDom = readPointerFromDomLike(domEvent);
    if (fromDom) {
      return fromDom;
    }
  } catch {
    // ignore
  }

  if (fallbackCoords) {
    return coordinatesToPixels(map, fallbackCoords);
  }

  return null;
}

function shouldSkipLongPress(
  event: YandexEvent | undefined,
  shouldSkipTarget?: (target: unknown) => boolean
): boolean {
  try {
    const target = event?.get?.("target");
    if (isGeoObjectTarget(target)) {
      return true;
    }

    if (shouldSkipTarget?.(target)) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function attachMapLongPress(map: YandexMap, options: MapLongPressOptions): () => void {
  const mapWithEvents = map as MapWithEvents;
  if (!mapWithEvents.events) {
    return () => {};
  }

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingPress: PendingPress | null = null;
  let moveThresholdPx = MOVE_THRESHOLD_PX;
  let suppressNextClick = false;

  const clearTimer = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    pendingPress = null;
  };

  const triggerLongPress = (press: PendingPress) => {
    suppressNextClick = true;
    options.onLongPress(press);

    try {
      navigator.vibrate?.(10);
    } catch {
      // ignore
    }
  };

  const scheduleLongPress = (press: PendingPress, isTouch = false) => {
    clearTimer();
    pendingPress = press;
    moveThresholdPx = isTouch ? MOVE_THRESHOLD_TOUCH_PX : MOVE_THRESHOLD_PX;

    timerId = setTimeout(() => {
      const activePress = pendingPress;
      clearTimer();

      if (!activePress) {
        return;
      }

      triggerLongPress(activePress);
    }, LONG_PRESS_DELAY_MS);
  };

  const handleMapPressStart = (event?: YandexEvent) => {
    if (shouldSkipLongPress(event, options.shouldSkipTarget)) {
      clearTimer();
      return;
    }

    const coords = getClickCoordinates(event);
    const anchor = getAnchorFromMapEvent(event, map, coords);
    if (!anchor || !coords) {
      return;
    }

    const domEvent = event?.get?.("domEvent") as { get?: (key: string) => unknown } | undefined;
    const pointerType = domEvent?.get?.("pointerType");
    const isTouch = pointerType === "touch" || pointerType === "pen";

    scheduleLongPress({ anchor, coords }, isTouch);
  };

  const handleMapPressMove = (event?: YandexEvent) => {
    if (!pendingPress) {
      return;
    }

    const anchor = getAnchorFromMapEvent(event, map, pendingPress.coords);
    if (!anchor) {
      return;
    }

    const deltaX = Math.abs(anchor.x - pendingPress.anchor.x);
    const deltaY = Math.abs(anchor.y - pendingPress.anchor.y);
    if (deltaX > moveThresholdPx || deltaY > moveThresholdPx) {
      clearTimer();
    }
  };

  const handleMapPressEnd = () => {
    clearTimer();
  };

  const handleActionBegin = () => {
    clearTimer();
  };

  const handleClick = (event?: YandexEvent) => {
    if (!suppressNextClick) {
      return;
    }

    suppressNextClick = false;

    try {
      const domEvent = event?.get?.("domEvent") as { callMethod?: (name: string) => void } | undefined;
      domEvent?.callMethod?.("preventDefault");
      domEvent?.callMethod?.("stopPropagation");
    } catch {
      // ignore
    }
  };

  const handleContextMenu = (event?: YandexEvent) => {
    try {
      const domEvent = event?.get?.("domEvent") as { callMethod?: (name: string) => void } | undefined;
      domEvent?.callMethod?.("preventDefault");
    } catch {
      // ignore
    }
  };

  mapWithEvents.events.add("mousedown", handleMapPressStart);
  mapWithEvents.events.add("mousemove", handleMapPressMove);
  mapWithEvents.events.add("mouseup", handleMapPressEnd);
  mapWithEvents.events.add("actionbegin", handleActionBegin);
  mapWithEvents.events.add("click", handleClick);
  mapWithEvents.events.add("contextmenu", handleContextMenu);

  const mapElement = getMapContainerElement(map);
  const domCleanups: Array<() => void> = [];

  if (mapElement) {
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        clearTimer();
        return;
      }

      const touch = event.touches[0];
      const anchor = { x: touch.clientX, y: touch.clientY };
      const coords = pagePointToCoords(map, touch.clientX, touch.clientY);
      if (!coords) {
        return;
      }

      scheduleLongPress({ anchor, coords }, true);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pendingPress || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - pendingPress.anchor.x);
      const deltaY = Math.abs(touch.clientY - pendingPress.anchor.y);
      if (deltaX > MOVE_THRESHOLD_TOUCH_PX || deltaY > MOVE_THRESHOLD_TOUCH_PX) {
        clearTimer();
      }
    };

    const handleTouchEnd = () => {
      clearTimer();
    };

    const handleDomClickCapture = (event: Event) => {
      if (!suppressNextClick) {
        return;
      }

      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    mapElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    mapElement.addEventListener("touchmove", handleTouchMove, { passive: true });
    mapElement.addEventListener("touchend", handleTouchEnd, { passive: true });
    mapElement.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    mapElement.addEventListener("click", handleDomClickCapture, true);

    domCleanups.push(() => {
      mapElement.removeEventListener("touchstart", handleTouchStart);
      mapElement.removeEventListener("touchmove", handleTouchMove);
      mapElement.removeEventListener("touchend", handleTouchEnd);
      mapElement.removeEventListener("touchcancel", handleTouchEnd);
      mapElement.removeEventListener("click", handleDomClickCapture, true);
    });
  }

  return () => {
    clearTimer();
    mapWithEvents.events.remove("mousedown", handleMapPressStart);
    mapWithEvents.events.remove("mousemove", handleMapPressMove);
    mapWithEvents.events.remove("mouseup", handleMapPressEnd);
    mapWithEvents.events.remove("actionbegin", handleActionBegin);
    mapWithEvents.events.remove("click", handleClick);
    mapWithEvents.events.remove("contextmenu", handleContextMenu);
    domCleanups.forEach((cleanup) => cleanup());
  };
}
