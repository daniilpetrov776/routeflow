import { forwardRef, useImperativeHandle } from "react";
import { useAddressInput } from "@/hooks/useAddressInput";
import { AddressSuggestions } from "./address-suggestions";
import { AddressInputLabel } from "./address-input-label";
import { AddressInputWrapper } from "./address-input-wrapper";
import styles from "./address-input.module.css";

interface AddressInputProps {
  label?: string;
  icon?: string;
  value: string;
  placeholder: string;
  type: "start" | "destination";
  index?: number;
}

export const AddressInput = forwardRef<HTMLInputElement, AddressInputProps>(function AddressInput(
  { label, icon, value, placeholder, type, index },
  ref
) {
  const controller = useAddressInput({ type, index, value });

  useImperativeHandle(ref, () => controller.inputRef.current!, []);

  return (
    <div className={styles["address-input"]}>
      <AddressInputLabel label={label} icon={icon} />

      <AddressInputWrapper
        inputRef={controller.inputRef}
        value={value}
        inputValue={controller.inputValue}
        placeholder={placeholder}
        type={type}
        onInputChange={controller.handleInputChange}
        onInputKeyDown={controller.handleKeyDown}
        onInputFocus={() => controller.setShowSuggestions(controller.suggestions.length > 0)}
        onInputBlur={() => {
          void controller.handleInputBlurAndSave();
        }}
        onRemove={controller.handleRemove}
      />

      {controller.showSuggestions && (
        <AddressSuggestions
          suggestions={controller.suggestions}
          isLoading={controller.isLoading}
          onSuggestionClick={(suggestion) => {
            void controller.handleSuggestionClick(suggestion);
          }}
          onToggleBusinessSelection={
            type === "destination" ? controller.handleToggleBusinessSelection : undefined
          }
          onAddSelectedBusinesses={
            type === "destination"
              ? () => {
                  void controller.handleAddSelectedBusinesses();
                }
              : undefined
          }
          selectedBusinessCount={controller.selectedBusinessKeys.size}
          canAddSelectedBusinesses={controller.selectedBusinessKeys.size > 0}
          isSuggestionAlreadyAdded={controller.isSuggestionAlreadyAdded}
          isBusinessSelected={controller.isBusinessSelected}
          suggestionsRef={controller.suggestionsRef}
          selectedIndex={controller.selectedIndex}
        />
      )}

      {controller.notFoundError && (
        <div className={styles["address-input__error"]}>{controller.notFoundError}</div>
      )}
    </div>
  );
});
