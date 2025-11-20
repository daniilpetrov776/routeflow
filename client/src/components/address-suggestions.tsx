import { useEffect, useRef } from "react";
import type { Suggestion } from "@/hooks/useAddressSuggestions";
import { sanitizeText } from "@/lib/sanitize";
import styles from "./address-input.module.css";

interface AddressSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: Suggestion) => void;
  suggestionsRef: React.RefObject<HTMLDivElement>;
  selectedIndex?: number;
}

export function AddressSuggestions({
  suggestions,
  isLoading,
  onSuggestionClick,
  suggestionsRef,
  selectedIndex = -1,
}: AddressSuggestionsProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Скроллим к выбранному элементу, если он не виден
  useEffect(() => {
    if (selectedIndex >= 0 && selectedItemRef.current && suggestionsRef.current) {
      const container = suggestionsRef.current;
      const item = selectedItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.top < containerRect.top) {
        // Элемент выше видимой области
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (itemRect.bottom > containerRect.bottom) {
        // Элемент ниже видимой области
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, suggestionsRef]);

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
      {suggestions.map((suggestion, idx) => (
        <div
          key={idx}
          ref={idx === selectedIndex ? selectedItemRef : null}
          onClick={() => onSuggestionClick(suggestion)}
          className={`${styles["address-input__suggestion-item"]} ${
            idx === selectedIndex ? styles["address-input__suggestion-item--selected"] : ""
          }`}
        >
          <div className={styles["address-input__suggestion-content"]}>
            <span className={styles["address-input__suggestion-icon"]}>
              📍
            </span>
            <div>
              <div className={styles["address-input__suggestion-title"]}>
                {sanitizeText(suggestion.title)}
              </div>
              {suggestion.subtitle && (
                <div className={styles["address-input__suggestion-subtitle"]}>
                  {sanitizeText(suggestion.subtitle)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

