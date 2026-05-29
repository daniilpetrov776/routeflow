import type { Suggestion } from "@/hooks/useAddressSuggestions";

export interface AddressInputKeyDownDeps {
  type: "start" | "destination";
  index?: number;
  showSuggestions: boolean;
  suggestions: Suggestion[];
  selectedIndex: number;
  selectedBusinessKeys: Set<string>;
  inputRef: React.RefObject<HTMLInputElement>;
  skipBlurSaveRef: React.MutableRefObject<boolean>;
  setShowSuggestions: (show: boolean) => void;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setInputValue: (value: string) => void;
  clearStartingPoint: () => void;
  removeDestination: (index: number) => void;
  isSuggestionAlreadyAdded: (suggestion: Suggestion) => boolean;
  handleToggleBusinessSelection: (suggestion: Suggestion) => void;
  handleSuggestionClick: (suggestion: Suggestion) => Promise<void>;
  handleInputBlurAndSave: (options?: { confirm?: boolean }) => Promise<void>;
  handleAddSelectedBusinesses: (extraSuggestions?: Suggestion[]) => Promise<void>;
}

export function createAddressInputKeyDownHandler({
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
  clearStartingPoint,
  removeDestination,
  isSuggestionAlreadyAdded,
  handleToggleBusinessSelection,
  handleSuggestionClick,
  handleInputBlurAndSave,
  handleAddSelectedBusinesses,
}: AddressInputKeyDownDeps) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      skipBlurSaveRef.current = true;

      if (type === "start") {
        clearStartingPoint();
        setInputValue("");
        inputRef.current?.blur();
        return;
      }

      if (type === "destination" && index !== undefined) {
        removeDestination(index);
        return;
      }

      inputRef.current?.blur();
    }

    if (e.key === "Enter") {
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

    if (e.key === "Tab") {
      skipBlurSaveRef.current = true;
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case " ":
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
}
