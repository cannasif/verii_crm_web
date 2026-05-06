import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ShippingAddressDto, CreateShippingAddressDto, UpdateShippingAddressDto } from '../types/shipping-address-types';

export const shippingAddressApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ShippingAddressDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ShippingAddressDto>>>('/api/ShippingAddress/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: ShippingAddressDto[], data?: ShippingAddressDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Sevk adresi listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ShippingAddressDto> => {
    const response = await api.get<ApiResponse<ShippingAddressDto>>(`/api/ShippingAddress/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sevk adresi detayı yüklenemedi');
  },

  getByCustomerId: async (customerId: number): Promise<ShippingAddressDto[]> => {
    const response = await api.get<ApiResponse<ShippingAddressDto[]>>(`/api/ShippingAddress/customer/${customerId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri sevk adresleri yüklenemedi');
  },

  create: async (data: CreateShippingAddressDto): Promise<ShippingAddressDto> => {
    const response = await api.post<ApiResponse<ShippingAddressDto>>('/api/ShippingAddress', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sevk adresi oluşturulamadı');
  },

  update: async (id: number, data: UpdateShippingAddressDto): Promise<ShippingAddressDto> => {
    const response = await api.put<ApiResponse<ShippingAddressDto>>(`/api/ShippingAddress/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sevk adresi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ShippingAddress/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Sevk adresi silinemedi');
    }
  },
};
