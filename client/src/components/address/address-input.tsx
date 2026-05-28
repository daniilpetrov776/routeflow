import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setStartingPoint, clearStartingPoint, updateDestination, removeDestination } from "@/store/route-slice";
import { resolveSuggestion, geocodeAddress } from "@/lib/geocoding";
import { useAddressSuggestions, type Suggestion } from "@/hooks/useAddressSuggestions";
import { AddressSuggestions } from "./address-suggestions";
import { AddressInputLabel } from "./address-input-label";
import { AddressInputWrapper } from "./address-input-wrapper";
import { ADDRESS_SUGGESTIONS_HIDE_DELAY, MOSCOW_CENTER } from "@/lib/map-constants";
import type { AddressPoint } from "@/store/route-slice";
import { RootState } from "@/store";
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
  const startingPoint = useSelector((state: RootState) => state.route.startingPoint);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const skipBlurSaveRef = useRef(false);

  const suggestLocationContext = useMemo(() => {
    const [lat, lon] = startingPoint?.coordinates ?? MOSCOW_CENTER;
    return {
      ll: `${lon},${lat}`,
      near: startingPoint?.address,
    };
  }, [startingPoint]);

  useImperativeHandle(ref, () => inputRef.current!, []);

  const {
    suggestions,
    showSuggestions,
    isLoading,
    fetchSuggestions,
    setShowSuggestions,
  } = useAddressSuggestions({ locationContext: suggestLocationContext });

  useEffect(() => {
    setInputValue(value);
    setSelectedIndex(-1);
  }, [value]);

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

  const applyAddressPoint = (addressPoint: AddressPoint) => {
    if (type === 'start') {
      dispatch(setStartingPoint(addressPoint));
    } else if (type === 'destination' && index !== undefined) {
      dispatch(updateDestination({ index, destination: addressPoint }));
    }
  };

  const resolveAndApply = async (input: {
    title: string;
    coordinates?: [number, number];
    uri?: string;
  }) => {
    const resolved = await resolveSuggestion(input);
    if (!resolved) {
      return false;
    }

    applyAddressPoint({
      address: resolved.address,
      coordinates: resolved.coordinates,
    });
    setInputValue(resolved.address);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    fetchSuggestions(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      skipBlurSaveRef.current = true;

      if (type === 'start') {
        dispatch(clearStartingPoint());
        setInputValue('');
        inputRef.current?.blur();
        return;
      }

      if (type === 'destination' && index !== undefined) {
        dispatch(removeDestination(index));
        return;
      }

      inputRef.current?.blur();
    }

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
          void handleSuggestionClick(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          void handleSuggestionClick(suggestions[0]);
        }
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          void handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
    }
  };

  const handleInputBlurAndSave = async () => {
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
      setTimeout(() => {
        if (!inputRef.current?.matches(':focus')) {
          setShowSuggestions(false);
        }
      }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
      return;
    }

    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowSuggestions(false);
      }
    }, ADDRESS_SUGGESTIONS_HIDE_DELAY);
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    const applied = await resolveAndApply(suggestion);
    if (!applied) {
      return;
    }

    setShowSuggestions(false);
    setSelectedIndex(-1);
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
          onSuggestionClick={(suggestion) => { void handleSuggestionClick(suggestion); }}
          suggestionsRef={suggestionsRef}
          selectedIndex={selectedIndex}
        />
      )}
    </div>
  );
});
