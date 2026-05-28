import type { YandexRoute } from "@/types/yandex-maps";

/**
 * Приводит результат model.getRoutes() к массиву (в рантайме может быть GeoObjectCollection).
 */
export function toYandexRoutesArray(
  routes: YandexRoute[] | { getLength(): number; get(i: number): YandexRoute } | null | undefined
): YandexRoute[] {
  if (!routes) return [];
  if (Array.isArray(routes)) return routes;
  const col = routes as { getLength(): number; get(i: number): YandexRoute };
  if (typeof col.getLength === "function" && typeof col.get === "function") {
    const out: YandexRoute[] = [];
    const n = col.getLength();
    for (let i = 0; i < n; i++) {
      out.push(col.get(i));
    }
    return out;
  }
  return [];
}
