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

export const dropdownApi = {
  getCustomerPage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerDto>> => {
    return getDropdownPage<CustomerDto>('/api/Customer', request, 'pageNumber');
  },
  getStockPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetDto>> => {
    // Stock API expects `page` instead of `pageNumber` for dropdown requests.
    return getDropdownPage<StockGetDto>('/api/Stock', request, 'page');
  },
  getStockWithImagesPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    return getDropdownPage<StockGetWithMainImageDto>('/api/Stock/withImages', request, 'page');
  },
  getCountryPage: (request: DropdownPageRequest): Promise<PagedResponse<CountryDto>> => {
    return getDropdownPage<CountryDto>('/api/Country', request, 'pageNumber');
  },
  getCityPage: (request: DropdownPageRequest): Promise<PagedResponse<CityDto>> => {
    return getDropdownPage<CityDto>('/api/City', request, 'pageNumber');
  },
  getDistrictPage: (request: DropdownPageRequest): Promise<PagedResponse<DistrictDto>> => {
    return getDropdownPage<DistrictDto>('/api/District', request, 'pageNumber');
  },
  getUserPage: (request: DropdownPageRequest): Promise<PagedResponse<UserDto>> => {
    return getDropdownPage<UserDto>('/api/User', request, 'pageNumber');
  },
  getApprovalRolePage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleDto>> => {
    return getDropdownPage<ApprovalRoleDto>('/api/ApprovalRole', request, 'pageNumber');
  },
  getApprovalRoleGroupPage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleGroupDto>> => {
    return getDropdownPage<ApprovalRoleGroupDto>('/api/ApprovalRoleGroup', request, 'pageNumber');
  },
  getTitlePage: (request: DropdownPageRequest): Promise<PagedResponse<TitleDto>> => {
    return getDropdownPage<TitleDto>('/api/Title', request, 'pageNumber');
  },
  getCustomerTypePage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerTypeDto>> => {
    return getDropdownPage<CustomerTypeDto>('/api/CustomerType', request, 'pageNumber');
  },
  getActivityTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPage<ActivityTypeDto>('/api/ActivityType', request, 'pageNumber');
  },
  getPaymentTypePage: (request: DropdownPageRequest): Promise<PagedResponse<PaymentTypeDto>> => {
    return getDropdownPage<PaymentTypeDto>('/api/PaymentType', request, 'pageNumber');
  },
  getActivityMeetingTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPage<ActivityTypeDto>('/api/ActivityMeetingType', request, 'pageNumber');
  },
  getActivityTopicPurposePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPage<ActivityTypeDto>('/api/ActivityTopicPurpose', request, 'pageNumber');
  },
  getActivityShippingPage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPage<ActivityTypeDto>('/api/ActivityShipping', request, 'pageNumber');
  },
  getSalesTypePage: (request: DropdownPageRequest): Promise<PagedResponse<SalesTypeGetDto>> => {
    return getDropdownPage<SalesTypeGetDto>('/api/SalesType', request, 'pageNumber');
  },
};
