import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useDispatch } from "react-redux";
import { setStartingPoint, clearStartingPoint, updateDestination, removeDestination } from "@/store/route-slice";
import { geocodeAddress } from "@/lib/geocoding";
import { useAddressSuggestions, type Suggestion } from "@/hooks/useAddressSuggestions";
import { AddressSuggestions } from "./address-suggestions";
import { AddressInputLabel } from "./address-input-label";
import { AddressInputWrapper } from "./address-input-wrapper";
import { ADDRESS_SUGGESTIONS_HIDE_DELAY } from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import styles from "./address-input.module.css";

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
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const skipBlurSaveRef = useRef(false); // Флаг для пропуска сохранения при blur
  
  // Синхронизируем внешний ref с внутренним
  useImperativeHandle(ref, () => inputRef.current!, []);
  
  const {
    suggestions,
    showSuggestions,
    isLoading,
    fetchSuggestions,
    setShowSuggestions,
  } = useAddressSuggestions();

  useEffect(() => {
    setInputValue(value);
    setSelectedIndex(-1); // Сбрасываем выбор при изменении value извне
  }, [value]);

  // Сбрасываем выбор при открытии/закрытии списка
  useEffect(() => {
    if (!showSuggestions) {
      setSelectedIndex(-1);
    }
  }, [showSuggestions]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1); // Сбрасываем выбор при изменении текста
    fetchSuggestions(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape обрабатываем всегда, независимо от наличия suggestions
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      
      // Устанавливаем флаг, чтобы пропустить сохранение при blur
      skipBlurSaveRef.current = true;
      
      // Для начальной точки - очищаем поле
      if (type === 'start') {
        dispatch(clearStartingPoint());
        setInputValue('');
        inputRef.current?.blur();
        return;
      }
      
      // Для destination - всегда удаляем поле при Escape
      if (type === 'destination' && index !== undefined) {
        dispatch(removeDestination(index));
        // Не вызываем blur, так как поле будет удалено и компонент размонтируется
        return;
      }
      
      // Иначе просто сбрасываем фокус
      inputRef.current?.blur();
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
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          // Если ничего не выбрано, выбираем первый вариант
          handleSuggestionClick(suggestions[0]);
        }
        break;
      case 'Tab':
        // Если список открыт и есть выбранный элемент, выбираем его перед переходом
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        // Иначе позволяем Tab работать как обычно
        break;
    }
  };

  const handleInputBlurAndSave = async () => {
    // Пропускаем сохранение, если был вызван Escape
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }

    const trimmedValue = inputValue.trim();
    if (!trimmedValue || trimmedValue === value?.trim()) {
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

    let resolvedAddress = matchedSuggestion?.title || trimmedValue;
    let coordinates = matchedSuggestion?.coordinates;

    if (!coordinates) {
      const geocoded = await geocodeAddress(trimmedValue);
      if (geocoded) {
        resolvedAddress = geocoded.address;
        coordinates = geocoded.coordinates;
      }
    }

    if (!coordinates) {
      console.warn("Не удалось определить координаты для адреса:", trimmedValue);
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    const addressPoint: AddressPoint = {
      address: resolvedAddress,
      coordinates,
    };

    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }

    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowSuggestions(false);
      }
    }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const addressPoint: AddressPoint = {
      address: suggestion.title,
      coordinates: suggestion.coordinates
    };

    setInputValue(suggestion.title);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }
  };

  const handleRemove = () => {
    if (type === 'start') {
      dispatch(clearStartingPoint());
      setInputValue('');
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
        showSuggestions={showSuggestions}
        suggestionsLength={suggestions.length}
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
          onSuggestionClick={handleSuggestionClick}
          suggestionsRef={suggestionsRef}
          selectedIndex={selectedIndex}
        />
      )}
    </div>
  );
});
