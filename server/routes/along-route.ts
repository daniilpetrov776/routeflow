import type { Express, Request, Response } from "express";
import { alongRouteRequestSchema } from "../lib/validation-schemas";
import {
  fetchGeosuggestData,
  fetchGeocoderByUri,
  fetchOrgSearchData,
  type OrgSearchResponse,
} from "../lib/yandex-api";
import { handleValidationError, handleError } from "../lib/error-handlers";
import logger from "../lib/logger";

/** Кандидат-организация рядом с маршрутом (координаты в формате [lon, lat]). */
export interface AlongRouteCandidate {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates: [number, number];
  uri?: string;
}

/** ~2 км вокруг каждой точки коридора. */
const DEFAULT_CORRIDOR_SPN = "0.02,0.02";
/** Сколько уникальных uri максимум дорезолвить через геокодер. */
const MAX_URI_RESOLUTIONS = 18;
/** Параллелизм геокодирования по uri. */
const GEOCODE_CONCURRENCY = 5;
/** Максимум кандидатов в ответе. */
const MAX_CANDIDATES = 24;

interface RawCandidate {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates?: [number, number];
  uri?: string;
}

function mapOrgSearchResults(data: OrgSearchResponse): RawCandidate[] {
  return (data.features ?? [])
    .map((feature) => {
      const company = feature.properties?.CompanyMetaData;
      const name = company?.name?.trim() || feature.properties?.name?.trim() || "";
      const formattedAddress =
        company?.Address?.formatted?.trim() ||
        company?.address?.trim() ||
        feature.properties?.description?.trim() ||
        name;
      const category = company?.Categories?.map((item) => item.name)
        .filter(Boolean)
        .join(", ");
      const [lon, lat] = feature.geometry?.coordinates ?? [];
      const hasCoordinates = Number.isFinite(lon) && Number.isFinite(lat);

      return {
        name,
        description: category || feature.properties?.description,
        fullAddress: formattedAddress,
        coordinates: hasCoordinates ? ([lon, lat] as [number, number]) : undefined,
        uri: feature.properties?.uri,
      } satisfies RawCandidate;
    })
    .filter((item) => item.name.length > 0);
}

function mapGeosuggestResults(data: Awaited<ReturnType<typeof fetchGeosuggestData>>): RawCandidate[] {
  return (data.results ?? [])
    .filter((item) => item.tags?.includes("business"))
    .map((item) => {
      const title = item.title?.text?.trim() ?? "";
      const subtitle = item.subtitle?.text?.trim();
      const formattedAddress = item.address?.formatted_address?.trim();

      return {
        name: title,
        description: subtitle,
        fullAddress: formattedAddress || title,
        uri: item.uri,
      } satisfies RawCandidate;
    })
    .filter((item) => item.name.length > 0);
}

async function fetchOrgSearchSafe(
  text: string,
  options: { ll: string; spn: string; results: number }
): Promise<OrgSearchResponse> {
  try {
    return await fetchOrgSearchData(text, { ...options, type: "biz" });
  } catch (orgSearchError) {
    const message =
      orgSearchError instanceof Error ? orgSearchError.message : String(orgSearchError);
    if (message.includes("403")) {
      logger.warn(
        "Org Search недоступен (403) для along-route: подключите «API Поиска по организациям» или задайте YANDEX_ORG_SEARCH_API_KEY"
      );
    } else {
      logger.warn(`Org Search along-route skipped: ${message}`);
    }
    return { features: [] } satisfies OrgSearchResponse;
  }
}

/** Извлекает [lon, lat] из ответа геокодера (Point.pos = "lon lat"). */
function extractCoordinatesFromGeocoder(data: unknown): [number, number] | undefined {
  const pos = (
    data as {
      response?: {
        GeoObjectCollection?: {
          featureMember?: Array<{ GeoObject?: { Point?: { pos?: string } } }>;
        };
      };
    }
  )?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;

  if (!pos) {
    return undefined;
  }

  const [lonRaw, latRaw] = pos.split(" ");
  const lon = Number(lonRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return undefined;
  }
  return [lon, lat];
}

function candidateKey(candidate: RawCandidate): string {
  if (candidate.uri) {
    return `uri:${candidate.uri}`;
  }
  if (candidate.coordinates) {
    return `coord:${candidate.coordinates[0].toFixed(5)},${candidate.coordinates[1].toFixed(5)}:${candidate.name.toLowerCase()}`;
  }
  return `name:${candidate.fullAddress || candidate.name}`.toLowerCase();
}

function dedupeCandidates(items: RawCandidate[]): RawCandidate[] {
  const seen = new Set<string>();
  const result: RawCandidate[] = [];
  for (const item of items) {
    const key = candidateKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

/** Дорезолвивает координаты для бизнесов без них через geocode-by-uri (ограниченно). */
async function resolveMissingCoordinates(candidates: RawCandidate[]): Promise<void> {
  const pending = candidates
    .filter((candidate) => !candidate.coordinates && candidate.uri)
    .slice(0, MAX_URI_RESOLUTIONS);

  for (let i = 0; i < pending.length; i += GEOCODE_CONCURRENCY) {
    const batch = pending.slice(i, i + GEOCODE_CONCURRENCY);
    await Promise.all(
      batch.map(async (candidate) => {
        try {
          const data = await fetchGeocoderByUri(candidate.uri as string);
          const coordinates = extractCoordinatesFromGeocoder(data);
          if (coordinates) {
            candidate.coordinates = coordinates;
          }
        } catch (error) {
          logger.warn(
            `along-route: не удалось геокодировать uri: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );
  }
}

/**
 * Роут для поиска организаций в коридоре вдоль маршрута.
 */
export function registerAlongRouteRoute(app: Express) {
  app.post("/api/along-route", async (req: Request, res: Response) => {
    try {
      const { text, points, spn } = alongRouteRequestSchema.parse(req.body);
      const corridorSpn = spn ?? DEFAULT_CORRIDOR_SPN;

      const perPointResults = await Promise.all(
        points.map(async ([lon, lat]) => {
          const ll = `${lon},${lat}`;
          const options = { ll, spn: corridorSpn, results: 10 };

          const [orgData, geosuggestData] = await Promise.all([
            fetchOrgSearchSafe(text, options),
            fetchGeosuggestData(text, { ll, spn: corridorSpn, results: 10, types: "biz" }),
          ]);

          return [...mapOrgSearchResults(orgData), ...mapGeosuggestResults(geosuggestData)];
        })
      );

      const merged = dedupeCandidates(perPointResults.flat());
      await resolveMissingCoordinates(merged);

      const candidates: AlongRouteCandidate[] = merged
        .filter((candidate): candidate is RawCandidate & { coordinates: [number, number] } =>
          Boolean(candidate.coordinates)
        )
        .slice(0, MAX_CANDIDATES)
        .map((candidate) => ({
          name: candidate.name,
          description: candidate.description,
          fullAddress: candidate.fullAddress,
          coordinates: candidate.coordinates,
          uri: candidate.uri,
        }));

      res.json({ candidates });
    } catch (error) {
      if (handleValidationError(error, req, res, "AlongRoute")) {
        return;
      }
      handleError(error, res, "Along-route search failed");
    }
  });
}
