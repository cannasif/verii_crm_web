import { useCallback, useEffect, useRef, useState } from 'react';

export interface CustomerComboListKeyboardParams<T> {
  readOnly: boolean;
  filterKey: string;
  filteredOptions: T[];
  comboboxOpen: boolean;
  setComboboxOpen: (open: boolean) => void;
  onSelectOption: (option: T) => void;
}

export interface CustomerComboListKeyboardResult {
  highlightIndex: number;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  isOptionKeyboardActive: (index: number) => boolean;
}

export function useCustomerComboListKeyboard<T>(
  params: CustomerComboListKeyboardParams<T>,
): CustomerComboListKeyboardResult {
  const { readOnly, filterKey, filteredOptions, comboboxOpen, setComboboxOpen, onSelectOption } = params;
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const highlightRef = useRef(-1);
  const prevFilterKeyRef = useRef(filterKey);

  highlightRef.current = highlightIndex;

  useEffect(() => {
    if (!comboboxOpen) {
      setHighlightIndex(-1);
      return;
    }
    const count = filteredOptions.length;
    if (count === 0) {
      setHighlightIndex(-1);
      return;
    }
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setHighlightIndex(0);
      return;
    }
    setHighlightIndex((prev) => {
      if (prev < 0) {
        return 0;
      }
      return Math.min(prev, count - 1);
    });
  }, [comboboxOpen, filterKey, filteredOptions]);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (readOnly) {
        return;
      }
      const count = filteredOptions.length;

      if (event.key === 'Escape') {
        if (comboboxOpen) {
          event.preventDefault();
          setComboboxOpen(false);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!comboboxOpen) {
          setComboboxOpen(true);
          setHighlightIndex(count > 0 ? 0 : -1);
          return;
        }
        setHighlightIndex((prev) => {
          if (count === 0) {
            return -1;
          }
          const cur = prev < 0 ? -1 : prev;
          const next = Math.min(cur + 1, count - 1);
          return Math.max(0, next);
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        if (!comboboxOpen) {
          return;
        }
        event.preventDefault();
        setHighlightIndex((prev) => {
          if (count === 0) {
            return -1;
          }
          const cur = prev < 0 ? 0 : prev;
          return Math.max(0, cur - 1);
        });
        return;
      }

      if (event.key === 'Enter') {
        if (comboboxOpen && count > 0) {
          const idx = highlightRef.current >= 0 ? highlightRef.current : 0;
          const option = filteredOptions[idx];
          if (option) {
            event.preventDefault();
            onSelectOption(option);
            setComboboxOpen(false);
            setHighlightIndex(-1);
          }
          return;
        }
        if (!comboboxOpen && count > 0) {
          const typed = event.currentTarget.value.trim();
          if (typed.length === 0) {
            return;
          }
          event.preventDefault();
          setComboboxOpen(true);
          setHighlightIndex(0);
        }
      }
    },
    [readOnly, filteredOptions, comboboxOpen, setComboboxOpen, onSelectOption],
  );

  const isOptionKeyboardActive = useCallback(
    (index: number): boolean => {
      return comboboxOpen && highlightIndex === index;
    },
    [comboboxOpen, highlightIndex],
  );

  return { highlightIndex, onInputKeyDown, isOptionKeyboardActive };
}
