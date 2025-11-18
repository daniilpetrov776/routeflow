import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setStartingPoint, updateDestination, removeDestination } from "@/store/route-slice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AddressPoint } from "@/store/route-slice";

interface Suggestion {
  title: string;
  subtitle: string;
  coordinates: [number, number];
}

interface AddressInputProps {
  label?: string;
  icon?: string;
  value: string;
  placeholder: string;
  type: 'start' | 'destination';
  index?: number;
}

type GeocodedAddress = {
  address: string;
  coordinates: [number, number];
};

const parseCoordinate = (value?: string) => {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim();
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const parsePosString = (pos?: string): [number, number] | null => {
  if (!pos) return null;
  const [lonRaw, latRaw] = pos.split(" ");
  const lon = parseCoordinate(lonRaw);
  const lat = parseCoordinate(latRaw);
  if (lon === null || lat === null) return null;
  return [lat, lon];
};

const geocodeAddress = async (query: string): Promise<GeocodedAddress | null> => {
  try {
    const response = await apiRequest(
      "GET",
      `/api/geocode?address=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    const geoObject =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const coordinates = parsePosString(geoObject?.Point?.pos);
    if (!coordinates) {
      return null;
    }
    return {
      address:
        geoObject?.metaDataProperty?.GeocoderMetaData?.text?.trim() || query,
      coordinates,
    };
  } catch (error) {
    console.error("Geocode lookup failed:", error);
    return null;
  }
};

export function AddressInput({
  label,
  icon,
  value,
  placeholder,
  type,
  index
}: AddressInputProps) {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  // Исправлено: убран NodeJS, заменён на number для браузерного setTimeout
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
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
          title: item.fullAddress || item.name || '',
          subtitle: item.description || '',
          coordinates: [lat, lon] as [number, number]
        };
      });

      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
      console.log(mapped)
    } catch (error) {
      console.error('Suggestions fetch failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 300);
  };

  const handleInputBlurAndSave = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || trimmedValue === value?.trim()) {
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, 150);
      return;
    }

    const matchedSuggestion = suggestions.find(
      (suggestion) => suggestion.title === trimmedValue
    );

    let resolvedAddress = matchedSuggestion?.title || trimmedValue;
    let coordinates = matchedSuggestion?.coordinates;

    if (!coordinates) {
      const geocoded = await geocodeAddress(trimmedValue);
      if (geocoded) {
        resolvedAddress = geocoded.address;
        coordinates = geocoded.coordinates;
      }
    }

    if (!coordinates) {
      console.warn("Не удалось определить координаты для адреса:", trimmedValue);
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, 150);
      return;
    }

    const addressPoint: AddressPoint = {
      address: resolvedAddress,
      coordinates,
    };

    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }

    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const addressPoint: AddressPoint = {
      address: suggestion.title,
      coordinates: suggestion.coordinates
    };

    setInputValue(suggestion.title);
    setShowSuggestions(false);

    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }
  };

  const handleRemove = () => {
    if (type === 'destination' && index !== undefined) {
      dispatch(removeDestination(index));
    }
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}

      <div className="relative flex items-center space-x-2">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 3 && setShowSuggestions(suggestions.length > 0)}
          onBlur={() => { void handleInputBlurAndSave(); }}
          placeholder={placeholder}
          className="address-input flex-1"
        />

        {type === 'destination' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="suggestion-item">
              <div className="animate-pulse">Загрузка предложений...</div>
            </div>
          ) : (
            suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="suggestion-item cursor-pointer p-2 hover:bg-accent"
              >
                <div className="flex items-center">
                  <span className="mr-3">📍</span>
                  <div>
                    <div className="font-medium text-foreground">{suggestion.title}</div>
                    {suggestion.subtitle && (
                      <div className="text-sm text-muted-foreground">{suggestion.subtitle}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
