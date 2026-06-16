import { useEffect, useState } from 'react';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

function getHasFinePointer(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

export function useHasFinePointer(): boolean {
  const [hasFinePointer, setHasFinePointer] = useState(getHasFinePointer);

  useEffect(() => {
    const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
    const handleChange = (): void => {
      setHasFinePointer(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return hasFinePointer;
}
