import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import type { PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import { filterDocumentsByApprovalStatus } from './filter-documents-by-status';
import type { DocumentApprovalStatusRecord } from './resolve-document-status';

export type DocumentListQueryParams = PagedParams & {
  filters?: PagedFilter[] | Record<string, unknown>;
  approvalStatusFilter?: string;
};

export async function fetchPagedDocumentList<T extends DocumentApprovalStatusRecord>(
  params: DocumentListQueryParams,
  fetchPage: (queryParams: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }) => Promise<PagedResponse<T>>
): Promise<PagedResponse<T>> {
  const {
    approvalStatusFilter = 'all',
    pageNumber = 1,
    pageSize = 10,
    filters,
    filterLogic,
    search,
    sortBy,
    sortDirection,
    contextUserId,
  } = params;

  const listParams = {
    filters,
    filterLogic,
    search,
    sortBy,
    sortDirection,
    contextUserId,
  };

  if (approvalStatusFilter === 'all') {
    return fetchPage({
      ...listParams,
      pageNumber,
      pageSize,
    });
  }

  const allRows = await fetchAllPagedData({
    fetchPage: (fetchPageNumber, fetchPageSize) =>
      fetchPage({
        ...listParams,
        pageNumber: fetchPageNumber,
        pageSize: fetchPageSize,
      }),
  });

  const filteredRows = filterDocumentsByApprovalStatus(allRows, approvalStatusFilter);
  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePageNumber = Math.min(Math.max(pageNumber, 1), totalPages);
  const startIndex = (safePageNumber - 1) * pageSize;
  const data = filteredRows.slice(startIndex, startIndex + pageSize);

  return {
    data,
    totalCount,
    pageNumber: safePageNumber,
    pageSize,
    totalPages,
    hasPreviousPage: safePageNumber > 1,
    hasNextPage: safePageNumber < totalPages,
  };
}
