import type { Express, Request, Response } from "express";
import { suggestQuerySchema } from "../lib/validation-schemas";
import { fetchGeosuggestData, fetchOrgSearchData } from "../lib/yandex-api";
import type { OrgSearchResponse } from "../lib/yandex-api";
import {
  buildPoiSearchText,
  isStreetNameFalsePositive,
  looksLikePoiCategoryQuery,
} from "../lib/poi-category";
import { handleValidationError, handleError } from "../lib/error-handlers";

export interface SuggestItem {
  name: string;
  description?: string;
  fullAddress?: string;
  coordinates?: [number, number];
  uri?: string;
  kind: "business" | "address";
}

/** ~2–3 км вокруг точки старта */
const LOCAL_SEARCH_SPN = "0.025,0.025";

function buildSearchOptions(ll?: string, bbox?: string) {
  const options: { ll?: string; bbox?: string; spn?: string; results: number } = {
    results: 10,
  };

  if (ll) {
    options.ll = ll;
    if (!bbox) {
      options.spn = LOCAL_SEARCH_SPN;
    }
  }
  if (bbox) {
    options.bbox = bbox;
  }

  return options;
}

function dedupeSuggestions(items: SuggestItem[]): SuggestItem[] {
  const seen = new Set<string>();
  const result: SuggestItem[] = [];

  for (const item of items) {
    const key = item.uri
      ? `uri:${item.uri}`
      : item.coordinates
        ? `coord:${item.coordinates[0].toFixed(5)},${item.coordinates[1].toFixed(5)}:${item.name}`
        : `name:${item.fullAddress || item.name}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

function finalizeSuggestions(items: SuggestItem[], query: string): SuggestItem[] {
  const deduped = dedupeSuggestions(items);

  if (!looksLikePoiCategoryQuery(query)) {
    return deduped.slice(0, 10);
  }

  const businesses = deduped.filter((item) => item.kind === "business");
  const addresses = deduped
    .filter((item) => item.kind === "address")
    .filter((item) => !isStreetNameFalsePositive(item.name, query));

  return [...businesses, ...addresses].slice(0, 10);
}

function mapGeosuggestResults(data: Awaited<ReturnType<typeof fetchGeosuggestData>>): SuggestItem[] {
  return (data.results ?? []).map((item) => {
    const isBusiness = item.tags?.includes("business") ?? false;
    const title = item.title?.text?.trim() ?? "";
    const subtitle = item.subtitle?.text?.trim();
    const formattedAddress = item.address?.formatted_address?.trim();

    return {
      name: title,
      description: subtitle,
      fullAddress: formattedAddress || title,
      uri: item.uri,
      kind: isBusiness ? "business" : "address",
    } satisfies SuggestItem;
  }).filter((item) => item.name.length > 0);
}

function mapOrgSearchResults(data: OrgSearchResponse): SuggestItem[] {
  return (data.features ?? []).map((feature) => {
    const company = feature.properties?.CompanyMetaData;
    const name = company?.name?.trim() || feature.properties?.name?.trim() || "";
    const formattedAddress =
      company?.Address?.formatted?.trim() ||
      company?.address?.trim() ||
      feature.properties?.description?.trim() ||
      name;
    const category = company?.Categories?.map((item) => item.name).filter(Boolean).join(", ");
    const [lon, lat] = feature.geometry?.coordinates ?? [];
    const hasCoordinates = Number.isFinite(lon) && Number.isFinite(lat);

    return {
      name,
      description: category || feature.properties?.description,
      fullAddress: formattedAddress,
      coordinates: hasCoordinates ? ([lon, lat] as [number, number]) : undefined,
      uri: feature.properties?.uri,
      kind: "business" as const,
    } satisfies SuggestItem;
  }).filter((item) => item.name.length > 0);
}

async function fetchOrgSearchSafe(text: string, searchOptions: ReturnType<typeof buildSearchOptions>) {
  try {
    return await fetchOrgSearchData(text, {
      ...searchOptions,
      type: "biz",
    });
  } catch (orgSearchError) {
    const message = orgSearchError instanceof Error ? orgSearchError.message : String(orgSearchError);
    if (message.includes("403")) {
      console.warn(
        "Org Search недоступен (403): подключите «API Поиска по организациям» для ключа в кабинете Яндекса " +
          "или задайте YANDEX_ORG_SEARCH_API_KEY"
      );
    } else {
      console.warn("Org Search suggest skipped:", orgSearchError);
    }
    return { features: [] } satisfies OrgSearchResponse;
  }
}

/**
 * Роут для получения предложений адресов и организаций
 */
export function registerSuggestRoute(app: Express) {
  app.get("/api/suggest", async (req: Request, res: Response) => {
    try {
      const validated = suggestQuerySchema.parse(req.query);
      const { text, ll, bbox, near } = validated;

      const searchOptions = buildSearchOptions(ll, bbox);
      const isPoiCategory = looksLikePoiCategoryQuery(text);
      const searchText = ll ? text : buildPoiSearchText(text, near);

      const [orgSearchData, geosuggestData] = await Promise.all([
        fetchOrgSearchSafe(searchText, searchOptions),
        fetchGeosuggestData(searchText, {
          ...searchOptions,
          types: isPoiCategory ? "biz" : "biz,geo",
        }),
      ]);

      const suggestions = finalizeSuggestions(
        [
          ...mapOrgSearchResults(orgSearchData),
          ...mapGeosuggestResults(geosuggestData),
        ],
        text
      );

      res.json({ suggestions });
    } catch (error) {
      if (handleValidationError(error, req, res, "Suggest")) {
        return;
      }

      handleError(error, res, "Suggest failed");
    }
  });
}
