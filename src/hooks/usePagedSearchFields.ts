import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FilterColumnConfig } from '@/lib/advanced-filter-types';

const STORAGE_PREFIX = 'paged-search-fields';

type SearchField = string | Pick<FilterColumnConfig, 'value' | 'type'>;

function resolveAllowedFields(fields: readonly SearchField[]): string[] {
  return fields
    .filter((field) => typeof field === 'string' || field.type === 'string')
    .map((field) => (typeof field === 'string' ? field : field.value))
    .filter((field, index, all) => field.length > 0 && all.indexOf(field) === index);
}

function loadSelectedFields(storageKey: string, allowedFields: readonly string[]): string[] {
  if (typeof window === 'undefined') return [...allowedFields];

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as unknown;
    if (Array.isArray(stored)) {
      const allowed = new Set(allowedFields);
      const selected = stored.filter(
        (field): field is string => typeof field === 'string' && allowed.has(field)
      );
      if (selected.length > 0) return [...new Set(selected)];
    }
  } catch {
    // Corrupt/private storage falls back to every allowed text field.
  }

  return [...allowedFields];
}

export function usePagedSearchFields(
  pageKey: string,
  userId: number | undefined,
  fields: readonly SearchField[]
): readonly [string[], (fields: string[]) => void] {
  const allowedFields = useMemo(() => resolveAllowedFields(fields), [fields]);
  const storageKey = `${STORAGE_PREFIX}:${pageKey}:${userId ?? 'anonymous'}`;
  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    loadSelectedFields(storageKey, allowedFields)
  );
  const previousStorageKey = useRef(storageKey);

  useEffect(() => {
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    setSelectedFields(loadSelectedFields(storageKey, allowedFields));
  }, [allowedFields, storageKey]);

  const changeSelectedFields = useCallback(
    (nextFields: string[]): void => {
      const allowed = new Set(allowedFields);
      const normalized = [...new Set(nextFields.filter((field) => allowed.has(field)))];
      const safeFields = normalized.length > 0 ? normalized : [...allowedFields];
      setSelectedFields(safeFields);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(safeFields));
      } catch {
        // Storage failures must not block searching.
      }
    },
    [allowedFields, storageKey]
  );

  return [selectedFields, changeSelectedFields] as const;
}
