import { getClickCoordinates } from "@/lib/balloon/balloon-coordinates";
import type { MapPlacementMode } from "@/store/route-slice";
import type { Coordinates, YandexEvent, YandexEventManager, YandexMap } from "@/types/yandex-maps";

type MapWithEvents = YandexMap & { events: YandexEventManager };

export interface MapClickPlacementOptions {
  getMode: () => MapPlacementMode;
  isBusy: () => boolean;
  onPlace: (coords: Coordinates) => void | Promise<void>;
  onCancel?: () => void;
}

export function isGeoObjectTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const candidate = target as {
    geometry?: unknown;
    getActiveRoute?: unknown;
    getPaths?: unknown;
  };

  return Boolean(
    candidate.geometry ||
      typeof candidate.getActiveRoute === "function" ||
      typeof candidate.getPaths === "function"
  );
}

function shouldSkipMapClick(event: YandexEvent | undefined, mode: MapPlacementMode, isBusy: boolean): boolean {
  if (mode === "idle" || isBusy) {
    return true;
  }

  try {
    const target = event?.get?.("target");
    if (isGeoObjectTarget(target)) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function attachMapClickPlacement(
  map: YandexMap,
  options: MapClickPlacementOptions
): () => void {
  const mapWithEvents = map as MapWithEvents;
  if (!mapWithEvents.events) {
    return () => {};
  }

  const handler = (event?: YandexEvent) => {
    const mode = options.getMode();
    if (shouldSkipMapClick(event, mode, options.isBusy())) {
      return;
    }

    const coords = getClickCoordinates(event);
    if (!coords) {
      return;
    }

    void options.onPlace(coords);
  };

  const contextMenuHandler = (event?: YandexEvent) => {
    const mode = options.getMode();
    if (mode === "idle") {
      return;
    }

    try {
      const domEvent = event?.get?.("domEvent") as MouseEvent | undefined;
      domEvent?.preventDefault?.();
    } catch {
      // ignore
    }

    options.onCancel?.();
  };

  mapWithEvents.events.add("click", handler);
  mapWithEvents.events.add("contextmenu", contextMenuHandler);

  return () => {
    mapWithEvents.events.remove("click", handler);
    mapWithEvents.events.remove("contextmenu", contextMenuHandler);
  };
}
