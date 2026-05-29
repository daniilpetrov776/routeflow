import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setStartingPoint,
  clearStartingPoint,
  updateDestination,
  removeDestination,
  addDestination,
} from "@/store/route-slice";
import { resolveSuggestion } from "@/lib/geocoding";
import { useAddressSuggestions, type Suggestion } from "@/hooks/useAddressSuggestions";
import { addSelectedBusinesses } from "@/lib/address-input/batch-add-businesses";
import { performBlurSave } from "@/lib/address-input/blur-save";
import { MIN_SUGGEST_QUERY_LENGTH, NOT_FOUND_MESSAGE } from "@/lib/address-input/constants";
import {
  buildSuggestLocationContext,
  getBusinessKey,
  isSuggestionAlreadyAdded as checkSuggestionAlreadyAdded,
} from "@/lib/address-input/helpers";
import { createAddressInputKeyDownHandler } from "@/lib/address-input/keyboard-handler";
import type { AddressPoint } from "@/store/route-slice";
import { RootState } from "@/store";

export interface UseAddressInputProps {
  type: "start" | "destination";
  index?: number;
  value: string;
}

export function useAddressInput({ type, index, value }: UseAddressInputProps) {
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

  const suggestLocationContext = useMemo(
    () => buildSuggestLocationContext(startingPoint),
    [startingPoint]
  );

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowSuggestions]);

  const applyAddressPoint = useCallback(
    (addressPoint: AddressPoint) => {
      if (type === "start") {
        dispatch(setStartingPoint(addressPoint));
      } else if (type === "destination" && index !== undefined) {
        dispatch(updateDestination({ index, destination: addressPoint }));
      }
    },
    [dispatch, type, index]
  );

  const resolveAndApply = useCallback(
    async (input: {
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
    },
    [applyAddressPoint]
  );

  const isSuggestionAlreadyAdded = useCallback(
    (suggestion: Suggestion) => checkSuggestionAlreadyAdded(suggestion, destinations),
    [destinations]
  );

  const isBusinessSelected = useCallback(
    (suggestion: Suggestion) => selectedBusinessKeys.has(getBusinessKey(suggestion)),
    [selectedBusinessKeys]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setNotFoundError(null);
      setSelectedIndex(-1);
      fetchSuggestions(newValue);
    },
    [fetchSuggestions]
  );

  const handleInputBlurAndSave = useCallback(
    async ({ confirm = false }: { confirm?: boolean } = {}) => {
      await performBlurSave({
        confirm,
        inputValue,
        value,
        type,
        index,
        suggestions,
        inputRef,
        skipBlurSaveRef,
        applyAddressPoint,
        resolveAndApply,
        setInputValue,
        setNotFoundError,
        setShowSuggestions,
        setSelectedIndex,
        setSelectedBusinessKeys,
        removeDestination: (destinationIndex) => dispatch(removeDestination(destinationIndex)),
      });
    },
    [
      inputValue,
      value,
      type,
      index,
      suggestions,
      applyAddressPoint,
      resolveAndApply,
      dispatch,
      setShowSuggestions,
    ]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: Suggestion) => {
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
    },
    [isSuggestionAlreadyAdded, resolveAndApply, setShowSuggestions]
  );

  const handleToggleBusinessSelection = useCallback(
    (suggestion: Suggestion) => {
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
    },
    [type, index, isSuggestionAlreadyAdded]
  );

  const handleAddSelectedBusinesses = useCallback(
    async (extraSuggestions: Suggestion[] = []) => {
      await addSelectedBusinesses({
        type,
        index,
        selectedBusinessKeys,
        extraSuggestions,
        suggestions,
        destinations,
        inputRef,
        skipBlurSaveRef,
        addDestination: (point) => dispatch(addDestination(point)),
        removeDestination: (destinationIndex) => dispatch(removeDestination(destinationIndex)),
        setSelectedBusinessKeys,
        setInputValue,
        setNotFoundError,
        setShowSuggestions,
        setSelectedIndex,
      });
    },
    [type, index, selectedBusinessKeys, suggestions, destinations, dispatch, setShowSuggestions]
  );

  const handleRemove = useCallback(() => {
    if (type === "start") {
      dispatch(clearStartingPoint());
      setInputValue("");
      setNotFoundError(null);
    } else if (type === "destination" && index !== undefined) {
      dispatch(removeDestination(index));
    }
  }, [type, index, dispatch]);

  const handleKeyDown = useMemo(
    () =>
      createAddressInputKeyDownHandler({
        type,
        index,
        showSuggestions,
        suggestions,
        selectedIndex,
        selectedBusinessKeys,
        inputRef,
        skipBlurSaveRef,
        setShowSuggestions,
        setSelectedIndex,
        setInputValue,
        clearStartingPoint: () => dispatch(clearStartingPoint()),
        removeDestination: (destinationIndex) => dispatch(removeDestination(destinationIndex)),
        isSuggestionAlreadyAdded,
        handleToggleBusinessSelection,
        handleSuggestionClick,
        handleInputBlurAndSave,
        handleAddSelectedBusinesses,
      }),
    [
      type,
      index,
      showSuggestions,
      suggestions,
      selectedIndex,
      selectedBusinessKeys,
      dispatch,
      isSuggestionAlreadyAdded,
      handleToggleBusinessSelection,
      handleSuggestionClick,
      handleInputBlurAndSave,
      handleAddSelectedBusinesses,
      setShowSuggestions,
    ]
  );

  return {
    inputRef,
    suggestionsRef,
    inputValue,
    notFoundError,
    showSuggestions,
    isLoading,
    suggestions,
    selectedIndex,
    selectedBusinessKeys,
    handleInputChange,
    handleKeyDown,
    handleInputBlurAndSave,
    handleSuggestionClick,
    handleToggleBusinessSelection,
    handleAddSelectedBusinesses,
    handleRemove,
    isSuggestionAlreadyAdded,
    isBusinessSelected,
    setShowSuggestions,
  };
}
