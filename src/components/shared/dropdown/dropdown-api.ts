import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import type { StockGetDto, StockGetWithMainImageDto } from '@/features/stock/types';
import type { CountryDto } from '@/features/country-management/types/country-types';
import type { CityDto } from '@/features/city-management/types/city-types';
import type { DistrictDto } from '@/features/district-management/types/district-types';
import type { UserDto } from '@/features/user-management/types/user-types';
import type { ApprovalRoleDto } from '@/features/approval-role-management/types/approval-role-types';
import type { ApprovalRoleGroupDto } from '@/features/approval-role-group-management/types/approval-role-group-types';
import type { TitleDto } from '@/features/title-management/types/title-types';
import type { CustomerTypeDto } from '@/features/customer-type-management/types/customer-type-types';
import type { ActivityTypeDto } from '@/features/activity-type/types/activity-type-types';
import type { PaymentTypeDto } from '@/features/payment-type-management/types/payment-type-types';
import type { SalesTypeGetDto } from '@/features/sales-type-management/types/sales-type-types';

interface DropdownPageRequest {
  pageNumber: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[] | Record<string, unknown>;
  filterLogic?: 'and' | 'or';
  contextUserId?: number;
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

  if (request.search) {
    queryParams.append('search', request.search);
  }

  if (request.sortBy) {
    queryParams.append('sortBy', request.sortBy);
  }

  if (request.sortDirection) {
    queryParams.append('sortDirection', request.sortDirection);
  }

  if (request.contextUserId) {
    queryParams.append('contextUserId', request.contextUserId.toString());
  }

  if (request.filters) {
    queryParams.append('filters', JSON.stringify(request.filters));
    queryParams.append('filterLogic', request.filterLogic ?? 'or');
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

async function getDropdownPageByQuery<T>(
  endpoint: string,
  request: DropdownPageRequest
): Promise<PagedResponse<T>> {
  const payload = {
    pageNumber: request.pageNumber,
    pageSize: request.pageSize,
    search: request.search ?? '',
    sortBy: request.sortBy ?? 'Id',
    sortDirection: request.sortDirection ?? 'asc',
    filterLogic: request.filterLogic ?? 'or',
    filters: request.filters ?? [],
    ...(request.contextUserId ? { contextUserId: request.contextUserId } : {}),
  };

  const response = await api.post<ApiResponse<PagedResponse<T>>>(`${endpoint}/query`, payload, {
    signal: request.signal,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Dropdown listesi yuklenemedi');
  }

  return normalizePagedResponse(response.data as PagedResponse<T> & { items?: T[] });
}

export const dropdownApi = {
  getCustomerPage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerDto>> => {
    return getDropdownPageByQuery<CustomerDto>('/api/Customer', request);
  },
  getStockPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetDto>> => {
    return getDropdownPageByQuery<StockGetDto>('/api/Stock', request);
  },
  getStockWithImagesPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    return getDropdownPageByQuery<StockGetWithMainImageDto>('/api/Stock/withImages', request);
  },
  getCountryPage: (request: DropdownPageRequest): Promise<PagedResponse<CountryDto>> => {
    return getDropdownPageByQuery<CountryDto>('/api/Country', request);
  },
  getCityPage: (request: DropdownPageRequest): Promise<PagedResponse<CityDto>> => {
    return getDropdownPageByQuery<CityDto>('/api/City', request);
  },
  getDistrictPage: (request: DropdownPageRequest): Promise<PagedResponse<DistrictDto>> => {
    return getDropdownPageByQuery<DistrictDto>('/api/District', request);
  },
  getUserPage: (request: DropdownPageRequest): Promise<PagedResponse<UserDto>> => {
    return getDropdownPageByQuery<UserDto>('/api/User', request);
  },
  getApprovalRolePage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleDto>> => {
    return getDropdownPage<ApprovalRoleDto>('/api/ApprovalRole', request, 'pageNumber');
  },
  getApprovalRoleGroupPage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleGroupDto>> => {
    return getDropdownPage<ApprovalRoleGroupDto>('/api/ApprovalRoleGroup', request, 'pageNumber');
  },
  getTitlePage: (request: DropdownPageRequest): Promise<PagedResponse<TitleDto>> => {
    return getDropdownPageByQuery<TitleDto>('/api/Title', request);
  },
  getCustomerTypePage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerTypeDto>> => {
    return getDropdownPageByQuery<CustomerTypeDto>('/api/CustomerType', request);
  },
  getActivityTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityType', request);
  },
  getPaymentTypePage: (request: DropdownPageRequest): Promise<PagedResponse<PaymentTypeDto>> => {
    return getDropdownPageByQuery<PaymentTypeDto>('/api/PaymentType', request);
  },
  getActivityMeetingTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityMeetingType', request);
  },
  getActivityTopicPurposePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityTopicPurpose', request);
  },
  getActivityShippingPage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityShipping', request);
  },
  getSalesTypePage: (request: DropdownPageRequest): Promise<PagedResponse<SalesTypeGetDto>> => {
    return getDropdownPage<SalesTypeGetDto>('/api/SalesType', request, 'pageNumber');
  },
};
