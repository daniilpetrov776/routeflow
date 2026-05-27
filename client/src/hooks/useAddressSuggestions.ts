import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatAddressDisplay } from "@/lib/address-format";
import { sanitizeText } from "@/lib/sanitize";

export interface Suggestion {
  title: string;
  subtitle: string;
  coordinates: [number, number];
}

/**
 * Тип для данных предложения из API
 */
interface ApiSuggestion {
  name?: string;
  description?: string;
  fullAddress?: string;
  coordinates?: [number, number];
}

interface UseAddressSuggestionsOptions {
  minQueryLength?: number;
  debounceMs?: number;
}

/**
 * Хук для работы с предложениями адресов
 */
export function useAddressSuggestions(options: UseAddressSuggestionsOptions = {}) {
  const { minQueryLength = 3, debounceMs = 800 } = options;
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());
  const requestSeqRef = useRef(0);

  const fetchSuggestions = useCallback(async (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const requestSeq = ++requestSeqRef.current;

    if (normalizedQuery.length < minQueryLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    const cached = cacheRef.current.get(normalizedQuery);
    if (cached) {
      setSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("GET", `/api/suggest?text=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (requestSeq !== requestSeqRef.current) return;
      
      const items: ApiSuggestion[] = (data.suggestions || []) as ApiSuggestion[];
      const mapped: Suggestion[] = items.map(item => {
        const [lon, lat] = item.coordinates || [0, 0];
        const title = sanitizeText(item.fullAddress || item.name || '');
        return {
          title: formatAddressDisplay(title),
          subtitle: sanitizeText(item.description || ''),
          coordinates: [lat, lon] as [number, number]
        };
      });

      cacheRef.current.set(normalizedQuery, mapped);
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return;
      console.error('Suggestions fetch failed:', error);
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
  };
}

