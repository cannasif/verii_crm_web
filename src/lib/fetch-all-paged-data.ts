import type { PagedResponse } from '@/types/api';

interface FetchAllPagedDataOptions<T> {
  fetchPage: (pageNumber: number, pageSize: number) => Promise<PagedResponse<T>>;
  pageSize?: number;
}

export async function fetchAllPagedData<T>({
  fetchPage,
  pageSize = 250,
}: FetchAllPagedDataOptions<T>): Promise<T[]> {
  const normalizedPageSize = Math.max(1, pageSize);
  const firstPage = await fetchPage(1, normalizedPageSize);
  const firstRows = firstPage.data ?? [];
  const totalPages = Math.max(firstPage.totalPages ?? 1, 1);

  if (totalPages <= 1) {
    return firstRows;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2, normalizedPageSize))
  );

  return [
    ...firstRows,
    ...remainingPages.flatMap((page) => page.data ?? []),
  ];
}
