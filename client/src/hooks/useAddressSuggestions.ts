import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatAddressDisplay } from "@/lib/address-format";
import { sanitizeText } from "@/lib/sanitize";

export type SuggestionKind = "business" | "address";

export interface Suggestion {
  title: string;
  subtitle: string;
  fullAddress?: string;
  coordinates?: [number, number];
  uri?: string;
  kind: SuggestionKind;
}

/**
 * Тип для данных предложения из API
 */
interface ApiSuggestion {
  name?: string;
  description?: string;
  fullAddress?: string;
  coordinates?: [number, number];
  uri?: string;
  kind?: SuggestionKind;
}

export interface SuggestLocationContext {
  ll?: string;
  bbox?: string;
  near?: string;
}

interface UseAddressSuggestionsOptions {
  minQueryLength?: number;
  debounceMs?: number;
  locationContext?: SuggestLocationContext;
}

function buildSuggestUrl(query: string, locationContext?: SuggestLocationContext): string {
  const params = new URLSearchParams({ text: query });

  if (locationContext?.ll) {
    params.set("ll", locationContext.ll);
  }
  if (locationContext?.bbox) {
    params.set("bbox", locationContext.bbox);
  }
  if (locationContext?.near) {
    params.set("near", locationContext.near);
  }

  return `/api/suggest?${params.toString()}`;
}

function buildCacheKey(query: string, locationContext?: SuggestLocationContext): string {
  return [
    query.trim().toLowerCase(),
    locationContext?.ll ?? "",
    locationContext?.bbox ?? "",
    locationContext?.near ?? "",
  ].join("|");
}

/**
 * Хук для работы с предложениями адресов и организаций
 */
export function useAddressSuggestions(options: UseAddressSuggestionsOptions = {}) {
  const { minQueryLength = 3, debounceMs = 800, locationContext } = options;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());
  const requestSeqRef = useRef(0);
  const locationContextRef = useRef(locationContext);

  locationContextRef.current = locationContext;

  const fetchSuggestions = useCallback(async (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const requestSeq = ++requestSeqRef.current;
    const context = locationContextRef.current;
    const cacheKey = buildCacheKey(normalizedQuery, context);

    if (normalizedQuery.length < minQueryLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      setLastSearchedQuery(null);
      return;
    }

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      setIsLoading(false);
      setLastSearchedQuery(normalizedQuery);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("GET", buildSuggestUrl(query, context));
      const data = await response.json();
      if (requestSeq !== requestSeqRef.current) return;

      const items: ApiSuggestion[] = (data.suggestions || []) as ApiSuggestion[];
      const mapped: Suggestion[] = items.map((item) => {
        const [lon, lat] = item.coordinates ?? [];
        const kind: SuggestionKind = item.kind === "business" ? "business" : "address";
        const displayTitle = kind === "business"
          ? sanitizeText(item.name || item.fullAddress || "")
          : sanitizeText(item.fullAddress || item.name || "");
        const hasCoordinates = Number.isFinite(lon) && Number.isFinite(lat);

        return {
          title: formatAddressDisplay(displayTitle),
          subtitle: sanitizeText(item.description || ""),
          fullAddress: item.fullAddress ? formatAddressDisplay(sanitizeText(item.fullAddress)) : undefined,
          coordinates: hasCoordinates ? ([lat, lon] as [number, number]) : undefined,
          uri: item.uri,
          kind,
        };
      });

      cacheRef.current.set(cacheKey, mapped);
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
      setLastSearchedQuery(normalizedQuery);
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return;
      console.error("Suggestions fetch failed:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [minQueryLength]);

  const fetchSuggestionsDebounced = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);
  }, [fetchSuggestions, debounceMs]);

  const clearSuggestions = useCallback(() => {
    requestSeqRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setIsLoading(false);
    setLastSearchedQuery(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  return {
    suggestions,
    showSuggestions,
    isLoading,
    fetchSuggestions: fetchSuggestionsDebounced,
    setShowSuggestions,
    clearSuggestions,
    lastSearchedQuery,
  };
}
