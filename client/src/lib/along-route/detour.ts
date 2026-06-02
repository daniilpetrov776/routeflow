import { getYandexRoutingMode, createRoutingParams } from "@/lib/route/route-creator";
import { extractDistance, extractDuration } from "@/lib/route/route-properties";
import { toYandexRoutesArray } from "@/lib/route/yandex-route-utils";
import type { AddressPoint, TransportMode } from "@/store/route-slice";
import type { MultiRouteModel } from "@/types/yandex-maps";
import type { DetourResult } from "./types";

const DETOUR_TIMEOUT_MS = 12_000;

/**
 * Считает маршрут с заездом (старт → заезд → пункт) через модель MultiRoute
 * (без отрисовки на карте) и возвращает метрики вместе с дельтой к исходному.
 */
export function computeDetour(
  start: AddressPoint,
  via: AddressPoint,
  destination: AddressPoint,
  transportMode: TransportMode,
  base: { duration: number; distance: number }
): Promise<DetourResult | null> {
  return new Promise((resolve) => {
    const ModelConstructor = window.ymaps?.multiRouter?.MultiRouteModel;
    if (!ModelConstructor) {
      resolve(null);
      return;
    }

    let model: MultiRouteModel | null = null;
    let settled = false;

    const finish = (result: DetourResult | null) => {
      if (settled) return;
      settled = true;
      try {
        model?.destroy?.();
      } catch {
        // ignore
      }
      resolve(result);
    };

    try {
      const routingMode = getYandexRoutingMode(transportMode);
      const params = createRoutingParams(routingMode);

      model = new ModelConstructor(
        [start.coordinates, via.coordinates, destination.coordinates],
        params
      );

      model.events.add("requestsuccess", () => {
        const routes = toYandexRoutesArray(model?.getRoutes());
        const active = routes[0];
        if (!active) {
          finish(null);
          return;
        }

        const duration = extractDuration(active);
        const distance = extractDistance(active);

        finish({
          duration,
          distance,
          durationDelta: duration - base.duration,
          distanceDelta: distance - base.distance,
        });
      });

      model.events.add("requestfail", () => finish(null));
      window.setTimeout(() => finish(null), DETOUR_TIMEOUT_MS);
    } catch (error) {
      console.warn("Failed to compute detour route:", error);
      finish(null);
    }
  });
}
