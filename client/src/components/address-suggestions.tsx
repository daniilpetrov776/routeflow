import type { Suggestion } from "@/hooks/useAddressSuggestions";
import { sanitizeText } from "@/lib/sanitize";
import styles from "./address-input.module.css";

interface AddressSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: Suggestion) => void;
  suggestionsRef: React.RefObject<HTMLDivElement>;
}

export function AddressSuggestions({
  suggestions,
  isLoading,
  onSuggestionClick,
  suggestionsRef,
}: AddressSuggestionsProps) {
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
          onClick={() => onSuggestionClick(suggestion)}
          className={styles["address-input__suggestion-item"]}
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

