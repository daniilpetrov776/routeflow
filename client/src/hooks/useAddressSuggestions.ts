import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { sanitizeText } from "@/lib/sanitize";

export interface Suggestion {
  title: string;
  subtitle: string;
  coordinates: [number, number];
}

interface UseAddressSuggestionsOptions {
  minQueryLength?: number;
  debounceMs?: number;
}

/**
 * Хук для работы с предложениями адресов
 */
export function useAddressSuggestions(options: UseAddressSuggestionsOptions = {}) {
  const { minQueryLength = 3, debounceMs = 300 } = options;
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("GET", `/api/suggest?text=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      const items: any[] = data.suggestions || [];
      const mapped: Suggestion[] = items.map(item => {
        const [lon, lat] = item.coordinates || [0, 0];
        return {
          title: sanitizeText(item.fullAddress || item.name || ''),
          subtitle: sanitizeText(item.description || ''),
          coordinates: [lat, lon] as [number, number]
        };
      });

      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch (error) {
      console.error('Suggestions fetch failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
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
    setSuggestions([]);
    setShowSuggestions(false);
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

