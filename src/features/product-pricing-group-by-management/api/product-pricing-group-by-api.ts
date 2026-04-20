import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ProductPricingGroupByDto, CreateProductPricingGroupByDto, UpdateProductPricingGroupByDto } from '../types/product-pricing-group-by-types';

export const productPricingGroupByApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ProductPricingGroupByDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ProductPricingGroupByDto>>>(
      `/api/ProductPricingGroupBy?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: ProductPricingGroupByDto[], data?: ProductPricingGroupByDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma grubu listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ProductPricingGroupByDto> => {
    const response = await api.get<ApiResponse<ProductPricingGroupByDto>>(`/api/ProductPricingGroupBy/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma grubu detayı yüklenemedi');
  },

  create: async (data: CreateProductPricingGroupByDto): Promise<ProductPricingGroupByDto> => {
    const response = await api.post<ApiResponse<ProductPricingGroupByDto>>('/api/ProductPricingGroupBy', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma grubu oluşturulamadı');
  },

  update: async (id: number, data: UpdateProductPricingGroupByDto): Promise<ProductPricingGroupByDto> => {
    const response = await api.put<ApiResponse<ProductPricingGroupByDto>>(`/api/ProductPricingGroupBy/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ürün fiyatlandırma grubu güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ProductPricingGroupBy/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Ürün fiyatlandırma grubu silinemedi');
    }
  },
};
