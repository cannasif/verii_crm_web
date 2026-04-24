import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import { appendPagedQueryParams } from '@/utils/query-params';
import type {
  StockGetDto,
  StockGetWithMainImageDto,
  StockDetailGetDto,
  StockDetailCreateDto,
  StockDetailUpdateDto,
  StockImageDto,
  StockImageBulkImportQueuedDto,
  StockRelationDto,
  StockRelationCreateDto,
} from '../types';

export const stockApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<StockGetDto>> => {
    const queryParams = appendPagedQueryParams(new URLSearchParams(), params, {
      pageParamName: 'page',
    });

    const response = await api.get<ApiResponse<PagedResponse<StockGetDto>>>(
      `/api/Stock?${queryParams.toString()}`
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Stok listesi verisi alınamadı');
    }

    const pagedData = response.data;
    
    const rawData = pagedData as unknown as { items?: StockGetWithMainImageDto[], data?: StockGetWithMainImageDto[] };
    if (rawData.items && !rawData.data) {
      return {
        ...pagedData,
        data: rawData.items,
      };
    }
    
    return pagedData;
  },

  getById: async (id: number): Promise<StockGetDto> => {
    const response = await api.get<ApiResponse<StockGetDto>>(`/api/Stock/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Stok detayı yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Stok detayı verisi alınamadı');
    }

    return response.data;
  },

  getDetail: async (stockId: number): Promise<StockDetailGetDto | null> => {
    const response = await api.get<ApiResponse<StockDetailGetDto>>(`/api/StockDetail/stock/${stockId}`);
    
    if (response.statusCode === 404) {
      return null;
    }

    if (!response.success) {
      throw new Error(response.message || 'Stok detayı yüklenemedi');
    }

    if (!response.data) {
      return null;
    }

    return response.data;
  },

  createDetail: async (data: StockDetailCreateDto): Promise<StockDetailGetDto> => {
    const response = await api.post<ApiResponse<StockDetailGetDto>>('/api/StockDetail', data);
    
    if (!response.success) {
      throw new Error(response.message || 'Stok detayı oluşturulamadı');
    }

    if (!response.data) {
      throw new Error('Stok detayı verisi alınamadı');
    }

    return response.data;
  },

  updateDetail: async (id: number, data: StockDetailUpdateDto): Promise<StockDetailGetDto> => {
    const response = await api.put<ApiResponse<StockDetailGetDto>>(`/api/StockDetail/${id}`, data);
    
    if (!response.success) {
      throw new Error(response.message || 'Stok detayı güncellenemedi');
    }

    if (!response.data) {
      throw new Error('Stok detayı verisi alınamadı');
    }

    return response.data;
  },

  uploadImages: async (stockId: number, files: File[], altTexts?: string[]): Promise<StockImageDto[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (altTexts) {
      altTexts.forEach((text, index) => {
        formData.append(`altTexts[${index}]`, text);
      });
    }

    const response = await api.post<ApiResponse<StockImageDto[]>>(
      `/api/StockImage/upload/${stockId}`,
      formData
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Görseller yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Görsel verisi alınamadı');
    }

    return response.data;
  },

  queueBulkImageImport: async (archive: File): Promise<StockImageBulkImportQueuedDto> => {
    const formData = new FormData();
    formData.append('archive', archive);

    const response = await api.post<ApiResponse<StockImageBulkImportQueuedDto>>(
      '/api/StockImage/bulk-import',
      formData
    );

    if (!response.success) {
      throw new Error(response.message || 'Toplu stok görsel içe aktarma başlatılamadı');
    }

    if (!response.data) {
      throw new Error('Toplu stok görsel içe aktarma cevabı alınamadı');
    }

    return response.data;
  },

  getImages: async (stockId: number): Promise<StockImageDto[]> => {
    const response = await api.get<ApiResponse<StockImageDto[]>>(`/api/StockImage/by-stock/${stockId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Görseller yüklenemedi');
    }

    if (!response.data) {
      return [];
    }

    return response.data;
  },

  deleteImage: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/StockImage/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Görsel silinemedi');
    }
  },

  setPrimaryImage: async (id: number): Promise<StockImageDto> => {
    const response = await api.put<ApiResponse<StockImageDto>>(`/api/StockImage/set-primary/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Ana görsel ayarlanamadı');
    }

    if (!response.data) {
      throw new Error('Ana görsel verisi alınamadı');
    }

    return response.data;
  },

  getRelations: async (stockId: number): Promise<StockRelationDto[]> => {
    const response = await api.get<ApiResponse<StockRelationDto[]>>(`/api/StockRelation/by-stock/${stockId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Stok ilişkileri yüklenemedi');
    }

    if (!response.data) {
      return [];
    }

    return response.data;
  },

  createRelation: async (data: StockRelationCreateDto): Promise<StockRelationDto> => {
    const response = await api.post<ApiResponse<StockRelationDto>>('/api/StockRelation', data);
    
    if (!response.success) {
      throw new Error(response.message || 'Stok ilişkisi oluşturulamadı');
    }

    if (!response.data) {
      throw new Error('Stok ilişkisi verisi alınamadı');
    }

    return response.data;
  },

  deleteRelation: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/StockRelation/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Stok ilişkisi silinemedi');
    }
  },

  getListWithImages: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    const queryParams = appendPagedQueryParams(new URLSearchParams(), params, {
      pageParamName: 'page',
    });

    const response = await api.get<ApiResponse<PagedResponse<StockGetWithMainImageDto>>>(
      `/api/Stock/withImages?${queryParams.toString()}`
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Görselli stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Görselli stok listesi verisi alınamadı');
    }

    const pagedData = response.data;
    
    const rawData = pagedData as unknown as { items?: StockGetWithMainImageDto[], data?: StockGetWithMainImageDto[] };
    
    if (rawData.items && !rawData.data) {
      return {
        ...pagedData,
        data: rawData.items,
      };
    }
    
    return pagedData;
  },
};
