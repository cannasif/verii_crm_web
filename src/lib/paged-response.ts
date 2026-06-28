import type { PagedResponse } from '@/types/api';

type PagedResponseLike<T> = Partial<PagedResponse<T>> & {
  data?: unknown[];
  items?: unknown[];
  Items?: unknown[];
};

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;

function toPositiveInteger(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.trunc(numeric));
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.trunc(numeric);
}

export function normalizePagedResponse<T>(
  response: PagedResponseLike<T>,
  options: {
    pageNumber?: number;
    pageSize?: number;
    mapItem?: (item: unknown) => T;
  } = {}
): PagedResponse<T> {
  const rawRows = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.Items)
        ? response.Items
        : [];

  const requestedPageNumber = toPositiveInteger(options.pageNumber, DEFAULT_PAGE_NUMBER);
  const requestedPageSize = toPositiveInteger(options.pageSize, DEFAULT_PAGE_SIZE);
  const pageNumber = toPositiveInteger(response.pageNumber, requestedPageNumber);
  const pageSize = toPositiveInteger(response.pageSize, requestedPageSize);
  const totalCount = toNonNegativeInteger(response.totalCount, rawRows.length);
  const calculatedTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const totalPages = toPositiveInteger(response.totalPages, calculatedTotalPages);
  const effectiveTotalPages = Math.max(1, totalPages);

  return {
    ...(response as PagedResponse<T>),
    data: options.mapItem ? rawRows.map(options.mapItem) : (rawRows as T[]),
    totalCount,
    pageNumber,
    pageSize,
    totalPages: effectiveTotalPages,
    hasPreviousPage: response.hasPreviousPage ?? pageNumber > 1,
    hasNextPage: response.hasNextPage ?? pageNumber < effectiveTotalPages,
  };
}
