import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map-constants";
import type { YandexMap } from "@/types/yandex-maps";

export function initYandexMap(
  container: HTMLDivElement,
  yandexMapRef: React.MutableRefObject<YandexMap | null>
): void {
  if (window.ymaps && container) {
    yandexMapRef.current = new window.ymaps.Map(container, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      controls: [],
    });
  }
}

export function destroyYandexMap(yandexMapRef: React.MutableRefObject<YandexMap | null>): void {
  if (yandexMapRef.current) {
    yandexMapRef.current.destroy();
  }
}
