import {
  MAP_ANIMATION_DURATION,
  MAP_ZOOM_MARGIN,
  STARTING_POINT_ZOOM,
} from "@/lib/map-constants";
import type { Coordinates, YandexMap } from "@/types/yandex-maps";

function applyMapBounds(
  map: YandexMap,
  bounds: Coordinates[][]
): void {
  map.setBounds(bounds, {
    checkZoomRange: true,
    zoomMargin: MAP_ZOOM_MARGIN,
    duration: MAP_ANIMATION_DURATION,
  });
}

function cornerBounds(minLat: number, minLon: number, maxLat: number, maxLon: number): Coordinates[][] {
  return [[minLat, minLon], [maxLat, maxLon]] as unknown as Coordinates[][];
}

function runWithDelay(action: () => void, delay: number): void {
  if (delay > 0) {
    window.setTimeout(action, delay);
    return;
  }

  action();
}

export function fitMapToGeoObjects(map: YandexMap, delay = 0): void {
  runWithDelay(() => {
    const bounds = map.geoObjects.getBounds();
    if (bounds) {
      applyMapBounds(map, bounds);
    }
  }, delay);
}

/** Подгоняет карту по bounding box заданных точек (центр между крайними). */
export function fitMapToPoints(map: YandexMap, points: Coordinates[], delay = 0): void {
  if (points.length === 0) {
    return;
  }

  runWithDelay(() => {
    if (points.length === 1) {
      map.setCenter(points[0], STARTING_POINT_ZOOM, {
        duration: MAP_ANIMATION_DURATION,
      });
      return;
    }

    let minLat = points[0][0];
    let maxLat = points[0][0];
    let minLon = points[0][1];
    let maxLon = points[0][1];

    for (const [lat, lon] of points) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }

    applyMapBounds(map, cornerBounds(minLat, minLon, maxLat, maxLon));
  }, delay);
}
