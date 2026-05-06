import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ProductPricingGetDto, CreateProductPricingDto, UpdateProductPricingDto } from '../types/product-pricing-types';

export const productPricingApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ProductPricingGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ProductPricingGetDto>>>('/api/ProductPricing/query', {
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
      const rawData = pagedData as unknown as { items?: ProductPricingGetDto[], data?: ProductPricingGetDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ProductPricingGetDto> => {
    const response = await api.get<ApiResponse<ProductPricingGetDto>>(`/api/ProductPricing/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma detayı yüklenemedi');
  },

  create: async (data: CreateProductPricingDto): Promise<ProductPricingGetDto> => {
    const response = await api.post<ApiResponse<ProductPricingGetDto>>('/api/ProductPricing', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma oluşturulamadı');
  },

  update: async (id: number, data: UpdateProductPricingDto): Promise<ProductPricingGetDto> => {
    const response = await api.put<ApiResponse<ProductPricingGetDto>>(`/api/ProductPricing/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ProductPricing/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Ürün fiyatlandırma silinemedi');
    }
  },
};
