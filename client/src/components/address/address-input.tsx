import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setStartingPoint, clearStartingPoint, updateDestination, removeDestination, addDestination } from "@/store/route-slice";
import { resolveSuggestion, geocodeAddress } from "@/lib/geocoding";
import { getComparableSuggestionAddress, normalizeComparableAddress } from "@/lib/address-format";
import { useAddressSuggestions, type Suggestion } from "@/hooks/useAddressSuggestions";
import { AddressSuggestions } from "./address-suggestions";
import { AddressInputLabel } from "./address-input-label";
import { AddressInputWrapper } from "./address-input-wrapper";
import { ADDRESS_SUGGESTIONS_HIDE_DELAY, MOSCOW_CENTER } from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import { RootState } from "@/store";
import styles from "./address-input.module.css";

const NOT_FOUND_MESSAGE = "Ничего не найдено, попробуйте изменить запрос";
const MIN_SUGGEST_QUERY_LENGTH = 3;

const COORDINATE_MATCH_EPSILON = 0.0001;

interface AddressInputProps {
  label?: string;
  icon?: string;
  value: string;
  placeholder: string;
  type: 'start' | 'destination';
  index?: number;
}

export const AddressInput = forwardRef<HTMLInputElement, AddressInputProps>(function AddressInput({
  label,
  icon,
  value,
  placeholder,
  type,
  index
}, ref) {
  const dispatch = useDispatch();
  const startingPoint = useSelector((state: RootState) => state.route.startingPoint);
  const destinations = useSelector((state: RootState) => state.route.destinations);
  const [inputValue, setInputValue] = useState(value);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedBusinessKeys, setSelectedBusinessKeys] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const skipBlurSaveRef = useRef(false);

  const suggestLocationContext = useMemo(() => {
    const [lat, lon] = startingPoint?.coordinates ?? MOSCOW_CENTER;
    return {
      ll: `${lon},${lat}`,
      near: startingPoint?.address,
    };
  }, [startingPoint]);

  useImperativeHandle(ref, () => inputRef.current!, []);

  const {
    suggestions,
    showSuggestions,
    isLoading,
    fetchSuggestions,
    setShowSuggestions,
    lastSearchedQuery,
  } = useAddressSuggestions({ locationContext: suggestLocationContext });

  useEffect(() => {
    setInputValue(value);
    setSelectedIndex(-1);
  }, [value]);

  useEffect(() => {
    if (!showSuggestions) {
      setSelectedIndex(-1);
    }
  }, [showSuggestions]);

  useEffect(() => {
    setSelectedBusinessKeys(new Set());
  }, [inputValue]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    const normalized = trimmed.toLowerCase();

    if (
      isLoading ||
      normalized.length < MIN_SUGGEST_QUERY_LENGTH ||
      trimmed === value?.trim()
    ) {
      return;
    }

    if (lastSearchedQuery === normalized && suggestions.length === 0) {
      setNotFoundError(NOT_FOUND_MESSAGE);
    } else if (suggestions.length > 0) {
      setNotFoundError(null);
    }
  }, [inputValue, isLoading, lastSearchedQuery, suggestions, value]);

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
  }, [setShowSuggestions]);

  const applyAddressPoint = (addressPoint: AddressPoint) => {
    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }
  };

  const resolveAndApply = async (input: {
    title: string;
    fullAddress?: string;
    kind?: Suggestion["kind"];
    coordinates?: [number, number];
    uri?: string;
  }) => {
    const resolved = await resolveSuggestion(input);
    if (!resolved) {
      return false;
    }

    applyAddressPoint({
      address: resolved.address,
      coordinates: resolved.coordinates,
    });
    setInputValue(resolved.address);
    return true;
  };

  const isDestinationAlreadyAdded = useCallback((point: AddressPoint): boolean => {
    return destinations.some((destination) =>
      destination.address === point.address &&
      Math.abs(destination.coordinates[0] - point.coordinates[0]) < 0.0001 &&
      Math.abs(destination.coordinates[1] - point.coordinates[1]) < 0.0001
    );
  }, [destinations]);

  const isSuggestionAlreadyAdded = useCallback((suggestion: Suggestion): boolean => {
    const comparableAddress = normalizeComparableAddress(getComparableSuggestionAddress(suggestion));

    return destinations.some((destination) => {
      if (normalizeComparableAddress(destination.address) === comparableAddress) {
        return true;
      }

      if (
        suggestion.coordinates &&
        Math.abs(destination.coordinates[0] - suggestion.coordinates[0]) < COORDINATE_MATCH_EPSILON &&
        Math.abs(destination.coordinates[1] - suggestion.coordinates[1]) < COORDINATE_MATCH_EPSILON
      ) {
        return true;
      }

      return false;
    });
  }, [destinations]);

  const getBusinessKey = useCallback((suggestion: Suggestion): string => {
    return suggestion.uri?.trim() || `${suggestion.title.trim().toLowerCase()}|${suggestion.subtitle?.trim().toLowerCase() ?? ""}`;
  }, []);

  const isBusinessSelected = useCallback((suggestion: Suggestion): boolean => {
    return selectedBusinessKeys.has(getBusinessKey(suggestion));
  }, [getBusinessKey, selectedBusinessKeys]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setNotFoundError(null);
    setSelectedIndex(-1); // Сбрасываем выбор при изменении текста
    fetchSuggestions(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      skipBlurSaveRef.current = true;

      if (type === 'start') {
        dispatch(clearStartingPoint());
        setInputValue('');
        inputRef.current?.blur();
        return;
      }

      if (type === 'destination' && index !== undefined) {
        dispatch(removeDestination(index));
        return;
      }

      inputRef.current?.blur();
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      const highlightedSuggestion =
        showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length
          ? suggestions[selectedIndex]
          : null;
      const hasBusinessSuggestions =
        type === "destination" && suggestions.some((suggestion) => suggestion.kind === "business");

      if (hasBusinessSuggestions) {
        if (selectedBusinessKeys.size > 0) {
          void handleAddSelectedBusinesses();
          return;
        }

        if (
          highlightedSuggestion?.kind === "business" &&
          !isSuggestionAlreadyAdded(highlightedSuggestion)
        ) {
          void handleAddSelectedBusinesses([highlightedSuggestion]);
          return;
        }

        if (highlightedSuggestion?.kind === "business") {
          return;
        }
      }

      if (highlightedSuggestion) {
        void handleSuggestionClick(highlightedSuggestion);
        return;
      }

      void handleInputBlurAndSave({ confirm: true });
      return;
    }

    if (e.key === 'Tab') {
      skipBlurSaveRef.current = true;
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    // Остальные клавиши обрабатываем только если есть suggestions
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case ' ':
        e.preventDefault();
        if (type !== "destination" || selectedIndex < 0 || selectedIndex >= suggestions.length) {
          break;
        }
        {
          const suggestion = suggestions[selectedIndex];
          if (suggestion.kind === "business" && !isSuggestionAlreadyAdded(suggestion)) {
            handleToggleBusinessSelection(suggestion);
          }
        }
        break;
    }
  };

  const handleInputBlurAndSave = async ({ confirm = false }: { confirm?: boolean } = {}) => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }

    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      setNotFoundError(null);

      if (type === 'destination' && index !== undefined) {
        dispatch(removeDestination(index));
        return;
      }

      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    if (trimmedValue === value?.trim()) {
      setNotFoundError(null);
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    if (!confirm) {
      setNotFoundError(null);
      setSelectedIndex(-1);
      setSelectedBusinessKeys(new Set());
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    const matchedSuggestion = suggestions.find(
      (suggestion) => suggestion.title === trimmedValue
    );

    let applied = false;

    if (matchedSuggestion) {
      applied = await resolveAndApply(matchedSuggestion);
    } else {
      const geocoded = await geocodeAddress(trimmedValue);
      if (geocoded) {
        applyAddressPoint(geocoded);
        setInputValue(geocoded.address);
        applied = true;
      }
    }

    if (!applied) {
      setNotFoundError(NOT_FOUND_MESSAGE);
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    setNotFoundError(null);

    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowSuggestions(false);
      }
    }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (isSuggestionAlreadyAdded(suggestion)) {
      return;
    }

    const applied = await resolveAndApply(suggestion);
    if (!applied) {
      return;
    }

    setNotFoundError(null);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleToggleBusinessSelection = (suggestion: Suggestion) => {
    if (type !== "destination" || index === undefined) {
      return;
    }

    if (suggestion.kind !== "business") {
      return;
    }

    if (isSuggestionAlreadyAdded(suggestion)) {
      return;
    }
    const key = getBusinessKey(suggestion);
    setSelectedBusinessKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddSelectedBusinesses = async (extraSuggestions: Suggestion[] = []) => {
    if (type !== "destination" || index === undefined) {
      return;
    }

    const keysToAdd = new Set(selectedBusinessKeys);
    for (const suggestion of extraSuggestions) {
      if (suggestion.kind === "business" && !isSuggestionAlreadyAdded(suggestion)) {
        keysToAdd.add(getBusinessKey(suggestion));
      }
    }

    for (const key of [...keysToAdd]) {
      const suggestion = suggestions.find(
        (item) => item.kind === "business" && getBusinessKey(item) === key
      );
      if (suggestion && isSuggestionAlreadyAdded(suggestion)) {
        keysToAdd.delete(key);
      }
    }

    if (keysToAdd.size === 0) {
      return;
    }

    const selectedSuggestionsMap = new Map<string, Suggestion>();
    for (const suggestion of suggestions) {
      if (suggestion.kind === "business" && keysToAdd.has(getBusinessKey(suggestion))) {
        selectedSuggestionsMap.set(getBusinessKey(suggestion), suggestion);
      }
    }
    for (const suggestion of extraSuggestions) {
      if (suggestion.kind === "business" && keysToAdd.has(getBusinessKey(suggestion))) {
        selectedSuggestionsMap.set(getBusinessKey(suggestion), suggestion);
      }
    }

    const selectedSuggestions = Array.from(selectedSuggestionsMap.values());
    if (selectedSuggestions.length === 0) {
      return;
    }

    const resolvedCandidates = await Promise.all(
      selectedSuggestions.map((suggestion) =>
        resolveSuggestion({
          title: suggestion.title,
          fullAddress: suggestion.fullAddress,
          kind: suggestion.kind,
          coordinates: suggestion.coordinates,
          uri: suggestion.uri,
        })
      )
    );

    const pointsToAdd: AddressPoint[] = [];
    for (const candidate of resolvedCandidates) {
      if (!candidate || isDestinationAlreadyAdded(candidate)) {
        continue;
      }
      pointsToAdd.push(candidate);
    }

    if (pointsToAdd.length === 0) {
      skipBlurSaveRef.current = true;
      if (!destinations[index]?.address?.trim()) {
        dispatch(removeDestination(index));
      }
      setSelectedBusinessKeys(new Set());
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }

    skipBlurSaveRef.current = true;

    const shouldRemoveCurrentDestination = !destinations[index]?.address?.trim();
    if (shouldRemoveCurrentDestination) {
      dispatch(removeDestination(index));
    }

    for (const point of pointsToAdd) {
      dispatch(addDestination(point));
    }

    setSelectedBusinessKeys(new Set());
    setInputValue('');
    setNotFoundError(null);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleRemove = () => {
    if (type === 'start') {
      dispatch(clearStartingPoint());
      setInputValue('');
      setNotFoundError(null);
    } else if (type === 'destination' && index !== undefined) {
      dispatch(removeDestination(index));
    }
  };

  return (
    <div className={styles["address-input"]}>
      <AddressInputLabel label={label} icon={icon} />

      <AddressInputWrapper
        inputRef={inputRef}
        value={value}
        inputValue={inputValue}
        placeholder={placeholder}
        type={type}
        onInputChange={handleInputChange}
        onInputKeyDown={handleKeyDown}
        onInputFocus={() => setShowSuggestions(suggestions.length > 0)}
        onInputBlur={() => { void handleInputBlurAndSave(); }}
        onRemove={handleRemove}
      />

      {showSuggestions && (
        <AddressSuggestions
          suggestions={suggestions}
          isLoading={isLoading}
          onSuggestionClick={(suggestion) => { void handleSuggestionClick(suggestion); }}
          onToggleBusinessSelection={type === "destination" ? handleToggleBusinessSelection : undefined}
          onAddSelectedBusinesses={type === "destination" ? () => { void handleAddSelectedBusinesses(); } : undefined}
          selectedBusinessCount={selectedBusinessKeys.size}
          canAddSelectedBusinesses={selectedBusinessKeys.size > 0}
          isSuggestionAlreadyAdded={isSuggestionAlreadyAdded}
          isBusinessSelected={isBusinessSelected}
          suggestionsRef={suggestionsRef}
          selectedIndex={selectedIndex}
        />
      )}

      {notFoundError && (
        <div className={styles["address-input__error"]}>{notFoundError}</div>
      )}
    </div>
  );
});
