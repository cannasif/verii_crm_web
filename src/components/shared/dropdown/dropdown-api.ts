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
import type { ActivityAssigneeOptionDto } from '@/features/activity-management/types/activity-types';
import type { PaymentTypeDto } from '@/features/payment-type-management/types/payment-type-types';
import type { SalesTypeGetDto } from '@/features/sales-type-management/types/sales-type-types';
import type { ShippingAddressDto } from '@/features/shipping-address-management/types/shipping-address-types';

interface DropdownPageRequest {
  pageNumber: number;
  pageSize: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[] | Record<string, unknown>;
  filterLogic?: 'and' | 'or';
  contextUserId?: number;
  signal: AbortSignal;
}

function normalizePagedResponse<T>(pagedData: PagedResponse<T> & { items?: T[] }): PagedResponse<T> {
  const data = Array.isArray(pagedData.data)
    ? pagedData.data
    : Array.isArray(pagedData.items)
      ? pagedData.items
      : [];

  return {
    ...pagedData,
    data,
    totalCount: pagedData.totalCount ?? data.length,
    pageNumber: pagedData.pageNumber ?? 1,
    pageSize: pagedData.pageSize ?? data.length,
    totalPages: pagedData.totalPages ?? 1,
    hasPreviousPage: pagedData.hasPreviousPage ?? false,
    hasNextPage: pagedData.hasNextPage ?? false,
  };
}

function toQueryEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, '').endsWith('/query')
    ? endpoint.replace(/\/+$/, '')
    : `${endpoint.replace(/\/+$/, '')}/query`;
}

async function getDropdownPageByQuery<T>(
  endpoint: string,
  request: DropdownPageRequest,
  visibleSearchFields: readonly string[]
): Promise<PagedResponse<T>> {
  const payload = {
    pageNumber: request.pageNumber,
    pageSize: request.pageSize,
    search: request.search ?? '',
    searchFields: request.search
      ? (request.searchFields?.length ? request.searchFields : [...visibleSearchFields])
      : undefined,
    sortBy: request.sortBy ?? 'Id',
    sortDirection: request.sortDirection ?? 'asc',
    filterLogic: request.filterLogic ?? 'or',
    filters: request.filters ?? [],
    ...(request.contextUserId ? { contextUserId: request.contextUserId } : {}),
  };

  const response = await api.post<ApiResponse<PagedResponse<T>>>(toQueryEndpoint(endpoint), payload, {
    signal: request.signal,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Dropdown listesi yuklenemedi');
  }

  return normalizePagedResponse(response.data as PagedResponse<T> & { items?: T[] });
}

export const dropdownApi = {
  getCustomerPage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerDto>> => {
    return getDropdownPageByQuery<CustomerDto>('/api/Customer', request, [
      'CustomerCode', 'CustomerName', 'Phone1', 'Email', 'Address', 'City.Name', 'District.Name',
    ]);
  },
  getStockPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetDto>> => {
    return getDropdownPageByQuery<StockGetDto>('/api/Stock', request, ['ErpStockCode', 'StockName']);
  },
  getStockWithImagesPage: (request: DropdownPageRequest): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    return getDropdownPageByQuery<StockGetWithMainImageDto>('/api/Stock/withImages', request, ['ErpStockCode', 'StockName']);
  },
  getCountryPage: (request: DropdownPageRequest): Promise<PagedResponse<CountryDto>> => {
    return getDropdownPageByQuery<CountryDto>('/api/Country', request, ['Code', 'Name', 'ERPCode']);
  },
  getCityPage: (request: DropdownPageRequest): Promise<PagedResponse<CityDto>> => {
    return getDropdownPageByQuery<CityDto>('/api/City', request, ['Name', 'ERPCode', 'Country.Name']);
  },
  getDistrictPage: (request: DropdownPageRequest): Promise<PagedResponse<DistrictDto>> => {
    return getDropdownPageByQuery<DistrictDto>('/api/District', request, ['Name', 'ERPCode', 'PostalCode', 'City.Name']);
  },
  getUserPage: (request: DropdownPageRequest): Promise<PagedResponse<UserDto>> => {
    return getDropdownPageByQuery<UserDto>('/api/User', request, ['Username', 'Email', 'FirstName', 'LastName']);
  },
  getActivityAssigneePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityAssigneeOptionDto>> => {
    return getDropdownPageByQuery<ActivityAssigneeOptionDto>('/api/Activity/assignees', request, [
      'displayName', 'username', 'email',
    ]);
  },
  getApprovalRolePage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleDto>> => {
    return getDropdownPageByQuery<ApprovalRoleDto>('/api/ApprovalRole', request, ['Code', 'Name']);
  },
  getApprovalRoleGroupPage: (request: DropdownPageRequest): Promise<PagedResponse<ApprovalRoleGroupDto>> => {
    return getDropdownPageByQuery<ApprovalRoleGroupDto>('/api/ApprovalRoleGroup', request, ['Code', 'Name']);
  },
  getTitlePage: (request: DropdownPageRequest): Promise<PagedResponse<TitleDto>> => {
    return getDropdownPageByQuery<TitleDto>('/api/Title', request, ['TitleName']);
  },
  getCustomerTypePage: (request: DropdownPageRequest): Promise<PagedResponse<CustomerTypeDto>> => {
    return getDropdownPageByQuery<CustomerTypeDto>('/api/CustomerType', request, ['Code', 'Name']);
  },
  getActivityTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityType', request, ['Code', 'Name']);
  },
  getPaymentTypePage: (request: DropdownPageRequest): Promise<PagedResponse<PaymentTypeDto>> => {
    return getDropdownPageByQuery<PaymentTypeDto>('/api/PaymentType', request, ['Code', 'Name']);
  },
  getActivityMeetingTypePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityMeetingType', request, ['Code', 'Name']);
  },
  getActivityTopicPurposePage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityTopicPurpose', request, ['Code', 'Name']);
  },
  getActivityShippingPage: (request: DropdownPageRequest): Promise<PagedResponse<ActivityTypeDto>> => {
    return getDropdownPageByQuery<ActivityTypeDto>('/api/ActivityShipping', request, ['Code', 'Name']);
  },
  getSalesTypePage: (request: DropdownPageRequest): Promise<PagedResponse<SalesTypeGetDto>> => {
    return getDropdownPageByQuery<SalesTypeGetDto>('/api/SalesType', request, ['SalesType', 'Code', 'Name']);
  },
  getShippingAddressPage: (request: DropdownPageRequest): Promise<PagedResponse<ShippingAddressDto>> => {
    return getDropdownPageByQuery<ShippingAddressDto>('/api/ShippingAddress', request, [
      'Name',
      'ErpShippingCode',
      'Address',
      'ContactPerson',
      'City.Name',
      'District.Name',
    ]);
  },
};
