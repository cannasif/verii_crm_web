const TABLE_SORT_PREFIX = 'page-table-sort';

export interface TableSortPreference {
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export function getTableSortStorageKey(pageKey: string, userId: number | undefined): string {
  const uid = userId ?? 'anonymous';
  return `${TABLE_SORT_PREFIX}:${pageKey}:${uid}`;
}

export function loadTableSortPreference(
  pageKey: string,
  userId: number | undefined,
  defaults: TableSortPreference,
  validSortKeys: readonly string[]
): TableSortPreference {
  const key = getTableSortStorageKey(pageKey, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<TableSortPreference>;
    const sortBy =
      typeof parsed.sortBy === 'string' && validSortKeys.includes(parsed.sortBy)
        ? parsed.sortBy
        : defaults.sortBy;
    const sortDirection =
      parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc'
        ? parsed.sortDirection
        : defaults.sortDirection;
    return { sortBy, sortDirection };
  } catch {
    return defaults;
  }
}

export function saveTableSortPreference(
  pageKey: string,
  userId: number | undefined,
  prefs: TableSortPreference
): void {
  const key = getTableSortStorageKey(pageKey, userId);
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // quota / private mode
  }
}
