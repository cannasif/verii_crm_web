import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FilterColumnConfig } from '@/lib/advanced-filter-types';

const STORAGE_PREFIX = 'paged-search-fields';

type SearchField = string | Pick<FilterColumnConfig, 'value' | 'type'>;

function isRecordIdField(field: Pick<FilterColumnConfig, 'value' | 'type'>): boolean {
  return field.type === 'number' && field.value.toLocaleLowerCase('en-US') === 'id';
}

function resolveAllowedFields(fields: readonly SearchField[]): string[] {
  const resolved = fields
    .filter((field) => typeof field === 'string' || field.type === 'string' || isRecordIdField(field))
    .map((field) => (typeof field === 'string' ? field : field.value))
    .filter((field, index, all) => field.length > 0 && all.indexOf(field) === index);

  return resolved.some((field) => field.toLocaleLowerCase('en-US') === 'id')
    ? resolved
    : ['Id', ...resolved];
}

function normalizeDefaultFields(
  defaultFields: readonly string[] | undefined,
  allowedFields: readonly string[]
): string[] {
  if (!defaultFields?.length) return [...allowedFields].sort();
  const allowed = new Set(allowedFields);
  const normalized = [...new Set(defaultFields.filter((field) => allowed.has(field)))].sort();
  return normalized.length > 0 ? normalized : [...allowedFields].sort();
}

function loadSelectedFields(
  storageKey: string,
  allowedFields: readonly string[],
  defaultFields?: readonly string[]
): string[] {
  const fallbackFields = normalizeDefaultFields(defaultFields, allowedFields);
  if (typeof window === 'undefined') return fallbackFields;

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as unknown;
    if (Array.isArray(stored)) {
      const allowed = new Set(allowedFields);
      const selected = stored.filter(
        (field): field is string => typeof field === 'string' && allowed.has(field)
      );
      if (selected.length > 0) return [...new Set(selected)].sort();
    }
  } catch {
    // Corrupt/private storage falls back to every allowed text field.
  }

  return fallbackFields;
}

export function usePagedSearchFields(
  pageKey: string,
  userId: number | undefined,
  fields: readonly SearchField[],
  defaultFields?: readonly string[]
): readonly [string[], (fields: string[]) => void] {
  const allowedFields = useMemo(() => resolveAllowedFields(fields), [fields]);
  const storageKey = `${STORAGE_PREFIX}:${pageKey}:${userId ?? 'anonymous'}`;
  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    loadSelectedFields(storageKey, allowedFields, defaultFields)
  );
  const previousStorageKey = useRef(storageKey);

  useEffect(() => {
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    setSelectedFields(loadSelectedFields(storageKey, allowedFields, defaultFields));
  }, [allowedFields, defaultFields, storageKey]);

  const changeSelectedFields = useCallback(
    (nextFields: string[]): void => {
      const allowed = new Set(allowedFields);
      const normalized = [...new Set(nextFields.filter((field) => allowed.has(field)))].sort();
      const safeFields = normalized.length > 0
        ? normalized
        : normalizeDefaultFields(defaultFields, allowedFields);
      setSelectedFields(safeFields);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(safeFields));
      } catch {
        // Storage failures must not block searching.
      }
    },
    [allowedFields, defaultFields, storageKey]
  );

  return [selectedFields, changeSelectedFields] as const;
}
