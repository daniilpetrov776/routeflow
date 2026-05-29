import { geocodeAddress } from "@/lib/geocoding";
import { ADDRESS_SUGGESTIONS_HIDE_DELAY } from "@/lib/map-constants";
import type { Suggestion } from "@/hooks/useAddressSuggestions";
import type { AddressPoint } from "@/store/route-slice";
import { NOT_FOUND_MESSAGE } from "./constants";

export interface BlurSaveParams {
  confirm?: boolean;
  inputValue: string;
  value: string;
  type: "start" | "destination";
  index?: number;
  suggestions: Suggestion[];
  inputRef: React.RefObject<HTMLInputElement>;
  skipBlurSaveRef: React.MutableRefObject<boolean>;
  applyAddressPoint: (point: AddressPoint) => void;
  resolveAndApply: (input: {
    title: string;
    fullAddress?: string;
    kind?: Suggestion["kind"];
    coordinates?: [number, number];
    uri?: string;
  }) => Promise<boolean>;
  setInputValue: (value: string) => void;
  setNotFoundError: (error: string | null) => void;
  setShowSuggestions: (show: boolean) => void;
  setSelectedIndex: (index: number) => void;
  setSelectedBusinessKeys: (keys: Set<string>) => void;
  removeDestination: (index: number) => void;
}

function scheduleHideSuggestions(
  inputRef: React.RefObject<HTMLInputElement>,
  setShowSuggestions: (show: boolean) => void
) {
  setTimeout(() => {
    if (!inputRef.current?.matches(":focus")) {
      setShowSuggestions(false);
    }
  }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
}

export async function performBlurSave({
  confirm = false,
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
  removeDestination,
}: BlurSaveParams): Promise<void> {
  if (skipBlurSaveRef.current) {
    skipBlurSaveRef.current = false;
    return;
  }

  const trimmedValue = inputValue.trim();
  if (!trimmedValue) {
    setNotFoundError(null);

    if (type === "destination" && index !== undefined) {
      removeDestination(index);
      return;
    }

    scheduleHideSuggestions(inputRef, setShowSuggestions);
    return;
  }

  if (trimmedValue === value?.trim()) {
    setNotFoundError(null);
    scheduleHideSuggestions(inputRef, setShowSuggestions);
    return;
  }

  if (!confirm) {
    setNotFoundError(null);
    setSelectedIndex(-1);
    setSelectedBusinessKeys(new Set());
    scheduleHideSuggestions(inputRef, setShowSuggestions);
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
    scheduleHideSuggestions(inputRef, setShowSuggestions);
    return;
  }

  setNotFoundError(null);
  scheduleHideSuggestions(inputRef, setShowSuggestions);
}
