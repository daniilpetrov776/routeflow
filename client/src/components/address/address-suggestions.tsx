import { useEffect, useRef } from "react";
import type { Suggestion } from "@/hooks/useAddressSuggestions";
import { sanitizeText } from "@/lib/sanitize";
import styles from "./address-input.module.css";

interface AddressSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: Suggestion) => void;
  onToggleBusinessSelection?: (suggestion: Suggestion) => void;
  onAddSelectedBusinesses?: () => void;
  selectedBusinessCount?: number;
  canAddSelectedBusinesses?: boolean;
  isSuggestionAlreadyAdded?: (suggestion: Suggestion) => boolean;
  isBusinessSelected?: (suggestion: Suggestion) => boolean;
  suggestionsRef: React.RefObject<HTMLDivElement>;
  selectedIndex?: number;
}

function getSuggestionIcon(kind: Suggestion["kind"]): string {
  return kind === "business" ? "🏢" : "📍";
}

function getSuggestionKindLabel(kind: Suggestion["kind"]): string {
  return kind === "business" ? "Организация" : "Адрес";
}

export function AddressSuggestions({
  suggestions,
  isLoading,
  onSuggestionClick,
  onToggleBusinessSelection,
  onAddSelectedBusinesses,
  selectedBusinessCount = 0,
  canAddSelectedBusinesses = false,
  isSuggestionAlreadyAdded,
  isBusinessSelected,
  suggestionsRef,
  selectedIndex = -1,
}: AddressSuggestionsProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const businessHeaderRef = useRef<HTMLDivElement>(null);
  const businessSuggestionsCount = suggestions.filter((item) => item.kind === "business").length;
  const canSelectBusinesses = Boolean(onToggleBusinessSelection) && businessSuggestionsCount > 0;

  useEffect(() => {
    if (selectedIndex >= 0 && selectedItemRef.current && suggestionsRef.current) {
      const container = suggestionsRef.current;
      const item = selectedItemRef.current;
      const headerHeight = businessHeaderRef.current?.offsetHeight ?? 0;
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      const visibleTop = container.scrollTop + headerHeight;
      const visibleBottom = container.scrollTop + container.clientHeight;

      if (itemTop < visibleTop) {
        container.scrollTop = itemTop - headerHeight;
      } else if (itemBottom > visibleBottom) {
        container.scrollTop = itemBottom - container.clientHeight;
      }
    }
  }, [selectedIndex, suggestionsRef, canSelectBusinesses, suggestions.length]);

  if (isLoading) {
    return (
      <div
        ref={suggestionsRef}
        className={styles["address-input__suggestions"]}
      >
        <div className={styles["address-input__suggestion-item"]}>
          <div className={styles["address-input__loading"]}>
            Загрузка предложений...
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className={styles["address-input__suggestions"]}
    >
      {canSelectBusinesses && (
        <div ref={businessHeaderRef} className={styles["address-input__business-header"]}>
          <div>Выберите организации, которые нужно добавить в пункты назначения.</div>
          <button
            type="button"
            className={styles["address-input__add-selected-button"]}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onAddSelectedBusinesses?.()}
            disabled={!canAddSelectedBusinesses}
          >
            Добавить выбранные{selectedBusinessCount > 0 ? ` (${selectedBusinessCount})` : ""}
          </button>
        </div>
      )}
      {suggestions.map((suggestion, idx) => {
        const alreadyAdded = Boolean(isSuggestionAlreadyAdded?.(suggestion));
        const businessSelected = suggestion.kind === "business" && Boolean(isBusinessSelected?.(suggestion));

        return (
          <div
            key={`${suggestion.kind}-${suggestion.title}-${idx}`}
            ref={idx === selectedIndex ? selectedItemRef : null}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (alreadyAdded) {
                return;
              }
              onSuggestionClick(suggestion);
            }}
            className={`${styles["address-input__suggestion-item"]} ${
              idx === selectedIndex ? styles["address-input__suggestion-item--selected"] : ""
            } ${businessSelected ? styles["address-input__suggestion-item--business-selected"] : ""} ${
              alreadyAdded ? styles["address-input__suggestion-item--already-added"] : ""
            }`}
            aria-selected={suggestion.kind === "business" ? businessSelected : undefined}
            aria-disabled={alreadyAdded || undefined}
          >
            <div className={styles["address-input__suggestion-content"]}>
              <span className={styles["address-input__suggestion-icon"]}>
                {getSuggestionIcon(suggestion.kind)}
              </span>
              <div className={styles["address-input__suggestion-text"]}>
                <div className={styles["address-input__suggestion-title-row"]}>
                  <div className={styles["address-input__suggestion-title"]}>
                    {sanitizeText(suggestion.title)}
                  </div>
                  <span className={styles["address-input__suggestion-kind"]}>
                    {getSuggestionKindLabel(suggestion.kind)}
                  </span>
                </div>
                {alreadyAdded && (
                  <div className={styles["address-input__suggestion-status-row"]}>
                    <span className={styles["address-input__suggestion-in-route-badge"]}>
                      В маршруте
                    </span>
                  </div>
                )}
                {(suggestion.subtitle ||
                  (suggestion.kind === "business" && onToggleBusinessSelection && !alreadyAdded)) && (
                  <div className={styles["address-input__suggestion-meta-row"]}>
                    {suggestion.subtitle && (
                      <div className={styles["address-input__suggestion-subtitle"]}>
                        {sanitizeText(suggestion.subtitle)}
                      </div>
                    )}
                    {suggestion.kind === "business" && onToggleBusinessSelection && !alreadyAdded && (
                      <div className={styles["address-input__suggestion-actions"]}>
                        <button
                          type="button"
                          className={styles["address-input__add-business-button"]}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleBusinessSelection(suggestion);
                          }}
                        >
                          {isBusinessSelected?.(suggestion) ? "Выбрано" : "Выбрать"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
