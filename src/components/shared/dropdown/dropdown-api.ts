import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import type { StockGetDto, StockGetWithMainImageDto } from '@/features/stock/types';

interface DropdownPageRequest {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[] | Record<string, unknown>;
  signal: AbortSignal;
}

function normalizePagedResponse<T>(pagedData: PagedResponse<T> & { items?: T[] }): PagedResponse<T> {
  if (pagedData.items && !pagedData.data) {
    return {
      ...pagedData,
      data: pagedData.items,
    };
  }

  return pagedData;
}

function buildPagedQueryParams(
  request: Omit<DropdownPageRequest, 'signal'>,
  pageNumberParamName: 'pageNumber' | 'page'
): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.append(pageNumberParamName, request.pageNumber.toString());
  queryParams.append('pageSize', request.pageSize.toString());

  if (request.sortBy) {
    queryParams.append('sortBy', request.sortBy);
  }

  if (request.sortDirection) {
    queryParams.append('sortDirection', request.sortDirection);
  }

  if (request.filters) {
    queryParams.append('filters', JSON.stringify(request.filters));
    queryParams.append('filterLogic', 'or');
  }

  return queryParams;
}

async function getDropdownPage<T>(
  endpoint: string,
  request: DropdownPageRequest,
  pageNumberParamName: 'pageNumber' | 'page' = 'pageNumber'
): Promise<PagedResponse<T>> {
  const queryParams = buildPagedQueryParams(request, pageNumberParamName);
  // Pass AbortSignal so stale dropdown requests are cancelled on new search terms.
  const response = await api.get<ApiResponse<PagedResponse<T>>>(`${endpoint}?${queryParams.toString()}`, {
    signal: request.signal,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Dropdown listesi yüklenemedi');
  }

  return normalizePagedResponse(response.data as PagedResponse<T> & { items?: T[] });
}

export const dropdownApi = {
  getCustomerPage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerDto>> => {
    return getDropdownPage<CustomerDto>('/api/Customer', request, 'pageNumber');
  },
  getStockPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetDto>> => {
    // Stock API expects `page` instead of `pageNumber` for dropdown requests.
    return getDropdownPage<StockGetDto>('/api/Stock', request, 'page');
  },
  getStockWithImagesPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    // Stock-with-images endpoint follows the same `page` contract.
    return getDropdownPage<StockGetWithMainImageDto>('/api/Stock/withImages', request, 'page');
  },
};
