import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function useManagementShowStats(
  pageKey: string,
  userId?: number | string | null
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const storageKey = `${pageKey}-show-stats-${userId ?? 'default'}`;

  const [showStats, setShowStats] = useState<boolean>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(showStats));
  }, [showStats, storageKey]);

  return [showStats, setShowStats];
}
