import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse } from '@/types/api';
import type {
  CatalogCategoryCreateDto,
  CatalogCategoryReorderDto,
  CatalogCategoryUpdateDto,
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  CategoryRuleApplyResultDto,
  CategoryRulePreviewResultDto,
  ProductCategoryRuleCreateDto,
  ProductCategoryRuleDto,
  ProductCategoryRuleUpdateDto,
  CategoryRuleValueOptionDto,
  ProductCatalogCreateDto,
  ProductCatalogDto,
  ProductCatalogUpdateDto,
  StockCategoryCreateDto,
} from '../types/category-definition-types';

export const categoryDefinitionsApi = {
  getCatalogs: async (): Promise<ProductCatalogDto[]> => {
    const response = await api.get<ApiResponse<ProductCatalogDto[]>>('/api/Catalog');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kataloglar yüklenemedi');
  },

  createCatalog: async (data: ProductCatalogCreateDto): Promise<ProductCatalogDto> => {
    const response = await api.post<ApiResponse<ProductCatalogDto>>('/api/Catalog', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Katalog oluşturulamadı');
  },

  updateCatalog: async (id: number, data: ProductCatalogUpdateDto): Promise<ProductCatalogDto> => {
    const response = await api.put<ApiResponse<ProductCatalogDto>>(`/api/Catalog/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Katalog güncellenemedi');
  },

  deleteCatalog: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Catalog/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Katalog silinemedi');
    }
  },

  getCatalogCategories: async (catalogId: number, parentCatalogCategoryId?: number | null): Promise<CatalogCategoryNodeDto[]> => {
    const queryParams = new URLSearchParams();
    if (parentCatalogCategoryId != null) {
      queryParams.append('parentCatalogCategoryId', String(parentCatalogCategoryId));
    }

    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await api.get<ApiResponse<CatalogCategoryNodeDto[]>>(`/api/Catalog/${catalogId}/categories${suffix}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kategoriler yüklenemedi');
  },

  createCatalogCategory: async (catalogId: number, data: CatalogCategoryCreateDto): Promise<CatalogCategoryNodeDto> => {
    const response = await api.post<ApiResponse<CatalogCategoryNodeDto>>(`/api/Catalog/${catalogId}/categories`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kategori oluşturulamadı');
  },

  uploadCategoryImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<string>>('/api/Catalog/category-image/upload', formData);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Kategori görseli yüklenemedi');
  },

  updateCatalogCategory: async (
    catalogId: number,
    catalogCategoryId: number,
    data: CatalogCategoryUpdateDto
  ): Promise<CatalogCategoryNodeDto> => {
    const response = await api.put<ApiResponse<CatalogCategoryNodeDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}`,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kategori güncellenemedi');
  },

  reorderCatalogCategories: async (catalogId: number, data: CatalogCategoryReorderDto): Promise<void> => {
    const response = await api.post<ApiResponse<object>>(`/api/Catalog/${catalogId}/categories/reorder`, data);
    if (!response.success) {
      throw new Error(response.message || 'Kategori sırası güncellenemedi');
    }
  },

  deleteCatalogCategory: async (catalogId: number, catalogCategoryId: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Catalog/${catalogId}/categories/${catalogCategoryId}`);
    if (!response.success) {
      throw new Error(response.message || 'Kategori silinemedi');
    }
  },

  getCategoryRules: async (catalogId: number, catalogCategoryId: number): Promise<ProductCategoryRuleDto[]> => {
    const response = await api.get<ApiResponse<ProductCategoryRuleDto[]>>(`/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kurallar yüklenemedi');
  },

  getCategoryRuleValueOptions: async (
    catalogId: number,
    catalogCategoryId: number,
    stockAttributeType: number,
    search?: string
  ): Promise<CategoryRuleValueOptionDto[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('stockAttributeType', String(stockAttributeType));
    if (search?.trim()) {
      queryParams.append('search', search.trim());
    }

    const response = await api.get<ApiResponse<CategoryRuleValueOptionDto[]>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rule-value-options?${queryParams.toString()}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Kural değeri seçenekleri yüklenemedi');
  },

  createCategoryRule: async (
    catalogId: number,
    catalogCategoryId: number,
    data: ProductCategoryRuleCreateDto
  ): Promise<ProductCategoryRuleDto> => {
    const response = await api.post<ApiResponse<ProductCategoryRuleDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules`,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kural oluşturulamadı');
  },

  updateCategoryRule: async (
    catalogId: number,
    catalogCategoryId: number,
    ruleId: number,
    data: ProductCategoryRuleUpdateDto
  ): Promise<ProductCategoryRuleDto> => {
    const response = await api.put<ApiResponse<ProductCategoryRuleDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules/${ruleId}`,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kural güncellenemedi');
  },

  deleteCategoryRule: async (catalogId: number, catalogCategoryId: number, ruleId: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules/${ruleId}`);
    if (!response.success) {
      throw new Error(response.message || 'Kural silinemedi');
    }
  },

  previewCategoryRules: async (catalogId: number, catalogCategoryId: number): Promise<CategoryRulePreviewResultDto> => {
    const response = await api.get<ApiResponse<CategoryRulePreviewResultDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules/preview`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kural önizlemesi alınamadı');
  },

  applyCategoryRules: async (catalogId: number, catalogCategoryId: number): Promise<CategoryRuleApplyResultDto> => {
    const response = await api.post<ApiResponse<CategoryRuleApplyResultDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/rules/apply`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kurallar uygulanamadı');
  },

  createStockCategoryAssignment: async (
    catalogId: number,
    catalogCategoryId: number,
    data: StockCategoryCreateDto
  ): Promise<CatalogStockItemDto> => {
    const response = await api.post<ApiResponse<CatalogStockItemDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/stocks`,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Stok kategoriye bağlanamadı');
  },

  deleteStockCategoryAssignment: async (
    catalogId: number,
    catalogCategoryId: number,
    stockCategoryId: number
  ): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/stocks/${stockCategoryId}`
    );
    if (!response.success) {
      throw new Error(response.message || 'Stok bağlantısı kaldırılamadı');
    }
  },

  getCatalogCategoryStocks: async (
    catalogId: number,
    catalogCategoryId: number,
    params?: { pageNumber?: number; pageSize?: number; search?: string }
  ): Promise<PagedResponse<CatalogStockItemDto>> => {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.append('pageNumber', String(params.pageNumber));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    if (params?.search) queryParams.append('search', params.search);

    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await api.get<ApiResponse<PagedResponse<CatalogStockItemDto>>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/stocks${suffix}`
    );

    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: CatalogStockItemDto[]; data?: CatalogStockItemDto[] };

      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }

      return pagedData;
    }

    throw new Error(response.message || 'Kategori stokları yüklenemedi');
  },
};
