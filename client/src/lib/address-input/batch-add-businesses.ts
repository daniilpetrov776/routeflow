import { resolveSuggestion } from "@/lib/geocoding";
import type { Suggestion } from "@/hooks/useAddressSuggestions";
import type { AddressPoint } from "@/store/route-slice";
import { getBusinessKey, isDestinationAlreadyAdded, isSuggestionAlreadyAdded } from "./helpers";

export interface BatchAddBusinessesParams {
  type: "start" | "destination";
  index?: number;
  selectedBusinessKeys: Set<string>;
  extraSuggestions?: Suggestion[];
  suggestions: Suggestion[];
  destinations: AddressPoint[];
  inputRef: React.RefObject<HTMLInputElement>;
  skipBlurSaveRef: React.MutableRefObject<boolean>;
  addDestination: (point: AddressPoint) => void;
  removeDestination: (index: number) => void;
  setSelectedBusinessKeys: (keys: Set<string>) => void;
  setInputValue: (value: string) => void;
  setNotFoundError: (error: string | null) => void;
  setShowSuggestions: (show: boolean) => void;
  setSelectedIndex: (index: number) => void;
}

export async function addSelectedBusinesses({
  type,
  index,
  selectedBusinessKeys,
  extraSuggestions = [],
  suggestions,
  destinations,
  inputRef,
  skipBlurSaveRef,
  addDestination,
  removeDestination,
  setSelectedBusinessKeys,
  setInputValue,
  setNotFoundError,
  setShowSuggestions,
  setSelectedIndex,
}: BatchAddBusinessesParams): Promise<void> {
  if (type !== "destination" || index === undefined) {
    return;
  }

  const keysToAdd = new Set(selectedBusinessKeys);
  for (const suggestion of extraSuggestions) {
    if (suggestion.kind === "business" && !isSuggestionAlreadyAdded(suggestion, destinations)) {
      keysToAdd.add(getBusinessKey(suggestion));
    }
  }

  for (const key of [...keysToAdd]) {
    const suggestion = suggestions.find(
      (item) => item.kind === "business" && getBusinessKey(item) === key
    );
    if (suggestion && isSuggestionAlreadyAdded(suggestion, destinations)) {
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
    if (!candidate || isDestinationAlreadyAdded(candidate, destinations)) {
      continue;
    }
    pointsToAdd.push(candidate);
  }

  if (pointsToAdd.length === 0) {
    skipBlurSaveRef.current = true;
    if (!destinations[index]?.address?.trim()) {
      removeDestination(index);
    }
    setSelectedBusinessKeys(new Set());
    setInputValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    return;
  }

  skipBlurSaveRef.current = true;

  const shouldRemoveCurrentDestination = !destinations[index]?.address?.trim();
  if (shouldRemoveCurrentDestination) {
    removeDestination(index);
  }

  for (const point of pointsToAdd) {
    addDestination(point);
  }

  setSelectedBusinessKeys(new Set());
  setInputValue("");
  setNotFoundError(null);
  setShowSuggestions(false);
  setSelectedIndex(-1);
  inputRef.current?.blur();
}
