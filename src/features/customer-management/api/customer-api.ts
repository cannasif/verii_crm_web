import { api } from '@/lib/axios';
import type { ApiResponse, CustomerSyncTriggerResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '../types/customer-types';

const OPTIONAL_STRING_FIELDS: ReadonlyArray<keyof CreateCustomerDto> = [
  'customerCode',
  'taxNumber',
  'taxOffice',
  'tcknNumber',
  'address',
  'postalCode',
  'phone',
  'phone2',
  'email',
  'website',
  'notes',
  'salesRepCode',
  'groupCode',
  'accountingCode',
];

const sanitizeCustomerPayload = <T extends CreateCustomerDto | UpdateCustomerDto>(payload: T): T => {
  const next = { ...payload } as Record<string, unknown>;

  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = next[field];
    if (typeof value === 'string' && value.trim() === '') {
      delete next[field];
    }
  }

  return next as T;
};

export const customerApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<CustomerDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<CustomerDto>>>('/api/Customer/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
      ...(params.contextUserId ? { contextUserId: params.contextUserId } : {}),
    });
    
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<CustomerDto> & { items?: CustomerDto[] };
      
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Müşteri listesi yüklenemedi');
  },

  getById: async (id: number): Promise<CustomerDto> => {
    const response = await api.get<ApiResponse<CustomerDto>>(`/api/Customer/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri detayı yüklenemedi');
  },

  create: async (data: CreateCustomerDto): Promise<CustomerDto> => {
    const response = await api.post<ApiResponse<CustomerDto>>('/api/Customer', sanitizeCustomerPayload(data));
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri oluşturulamadı');
  },

  update: async (id: number, data: UpdateCustomerDto): Promise<CustomerDto> => {
    const response = await api.post<ApiResponse<CustomerDto>>(
      `/api/Customer/${id}`,
      sanitizeCustomerPayload(data)
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri güncellenemedi');
  },

  createErpCustomer: async (id: number): Promise<CustomerDto> => {
    const response = await api.post<ApiResponse<CustomerDto>>(`/api/Customer/${id}/erp-customer`, {});
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'ERP müşteri kaydı oluşturulamadı');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Customer/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Müşteri silinemedi');
    }
  },

  triggerSync: async (): Promise<CustomerSyncTriggerResponse> => {
    const response = await api.post<ApiResponse<CustomerSyncTriggerResponse>>('/api/Customer/sync');
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Müşteri sync tetiklenemedi');
  },
};
