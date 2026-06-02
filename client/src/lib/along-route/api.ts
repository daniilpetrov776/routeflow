import { apiRequest } from "@/lib/queryClient";
import type { Coordinates } from "@/types/yandex-maps";

/** Кандидат с сервера: координаты в формате [lon, lat]. */
interface ServerAlongRouteCandidate {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates: [number, number];
  uri?: string;
}

interface AlongRouteResponse {
  candidates: ServerAlongRouteCandidate[];
}

/** Кандидат после преобразования координат в клиентский формат [lat, lon]. */
export interface RawAlongRouteCandidate {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates: Coordinates;
  uri?: string;
}

/**
 * Ищет организации по тексту в коридоре вдоль маршрута.
 * @param text запрос (например, "кфс")
 * @param points точки коридора в формате [lon, lat]
 */
export async function searchAlongRoute(
  text: string,
  points: Array<[number, number]>
): Promise<RawAlongRouteCandidate[]> {
  if (!text.trim() || points.length === 0) {
    return [];
  }

  const response = await apiRequest("POST", "/api/along-route", { text, points });
  const data = (await response.json()) as AlongRouteResponse;

  return (data.candidates ?? [])
    .filter(
      (candidate) =>
        Array.isArray(candidate.coordinates) &&
        candidate.coordinates.length === 2 &&
        Number.isFinite(candidate.coordinates[0]) &&
        Number.isFinite(candidate.coordinates[1])
    )
    .map((candidate) => {
      const [lon, lat] = candidate.coordinates;
      return {
        name: candidate.name,
        description: candidate.description,
        fullAddress: candidate.fullAddress,
        coordinates: [lat, lon] as Coordinates,
        uri: candidate.uri,
      };
    });
}
