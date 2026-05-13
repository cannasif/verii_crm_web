import type { FilterRow } from './advanced-filter-types';

const TABLE_PAGINATION_PREFIX = 'page-table-pagination';

export interface TablePaginationState {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  appliedFilterRows?: FilterRow[];
}

function getTablePaginationStorageKey(pageKey: string, userId: number | undefined): string {
  const uid = userId ?? 'anonymous';
  return `${TABLE_PAGINATION_PREFIX}:${pageKey}:${uid}`;
}

export function loadTablePaginationState(
  pageKey: string,
  userId: number | undefined,
  defaults: TablePaginationState
): TablePaginationState {
  try {
    const key = getTablePaginationStorageKey(pageKey, userId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<TablePaginationState>;
    
    return {
      pageNumber: typeof parsed.pageNumber === 'number' && parsed.pageNumber > 0 ? parsed.pageNumber : defaults.pageNumber,
      pageSize: typeof parsed.pageSize === 'number' && parsed.pageSize > 0 ? parsed.pageSize : defaults.pageSize,
      searchTerm: typeof parsed.searchTerm === 'string' ? parsed.searchTerm : defaults.searchTerm,
      appliedFilterRows: Array.isArray(parsed.appliedFilterRows) ? parsed.appliedFilterRows : defaults.appliedFilterRows,
    };
  } catch {
    return defaults;
  }
}

export function saveTablePaginationState(
  pageKey: string,
  userId: number | undefined,
  state: TablePaginationState
): void {
  try {
    const key = getTablePaginationStorageKey(pageKey, userId);
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

export function clearTablePaginationState(pageKey: string, userId: number | undefined): void {
  try {
    const key = getTablePaginationStorageKey(pageKey, userId);
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
