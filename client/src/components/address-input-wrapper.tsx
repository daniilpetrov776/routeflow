import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import styles from "./address-input.module.css";

interface AddressInputWrapperProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  inputValue: string;
  placeholder: string;
  type: 'start' | 'destination';
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onRemove: () => void;
}

/**
 * Обертка для поля ввода с кнопкой удаления
 */
export function AddressInputWrapper({
  inputRef,
  value,
  inputValue,
  placeholder,
  type,
  onInputChange,
  onInputKeyDown,
  onInputFocus,
  onInputBlur,
  onRemove,
}: AddressInputWrapperProps) {
  return (
    <div className={styles["address-input__wrapper"]}>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
        onFocus={() => inputValue.length >= 3 && onInputFocus()}
        onBlur={onInputBlur}
        placeholder={placeholder}
        className={styles["address-input__input"]}
      />

      {((type === 'start' && value) || type === 'destination') && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className={styles["address-input__remove-button"]}
        >
          <X className={styles["address-input__remove-icon"]} />
        </Button>
      )}
    </div>
  );
}

