import { useState, useEffect, useRef } from "react";
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

export function AddressInput({
  label,
  icon,
  value,
  placeholder,
  type,
  index
}: AddressInputProps) {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const {
    suggestions,
    showSuggestions,
    isLoading,
    fetchSuggestions,
    setShowSuggestions,
  } = useAddressSuggestions();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

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
    fetchSuggestions(newValue);
  };

  const handleInputBlurAndSave = async () => {
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
        />
      )}
    </div>
  );
}
