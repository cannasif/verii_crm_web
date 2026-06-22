import { api } from '@/lib/axios';
import type { CatalogSpecialCodeSelections } from '@/components/shared/catalog-special-code-filter';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  StockGetDto,
  StockGetWithMainImageDto,
  StockDetailGetDto,
  StockDetailCreateDto,
  StockDetailUpdateDto,
  StockImageDto,
  StockImageBulkImportQueuedDto,
  StockFavoriteToggleDto,
  StockFavoriteToggleResultDto,
  StockRelationDto,
  StockRelationCreateDto,
  StockCreateDto,
  WarehouseStockBalanceDto,
  StockCodeFilterOptionsDto,
} from '../types';

type StockCodeFilterListParams = PagedParams & {
  filters?: PagedFilter[] | Record<string, unknown>;
  codeFilters: CatalogSpecialCodeSelections;
};

type StockCodeFilterOptionsQuery = {
  search?: string;
  pageSize?: number;
};

function normalizePagedResponse<T>(pagedData: PagedResponse<T>): PagedResponse<T> {
  const rawData = pagedData as unknown as { items?: T[]; data?: T[] };
  if (rawData.items && !rawData.data) {
    return {
      ...pagedData,
      data: rawData.items,
    };
  }

  return pagedData;
}

export const stockApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<StockGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<StockGetDto>>>('/api/Stock/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Stok listesi verisi alınamadı');
    }

    return normalizePagedResponse(response.data);
  },

  getListByErpStockCodes: async (erpStockCodes: string[]): Promise<StockGetDto[]> => {
    const unique = [...new Set(erpStockCodes.map((c) => c.trim()).filter((c) => c.length > 0))];
    if (unique.length === 0) {
      return [];
    }
    const chunkSize = 25;
    const merged: StockGetDto[] = [];
    const seenIds = new Set<number>();
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const page = await stockApi.getList({
        pageNumber: 1,
        pageSize: Math.max(60, chunk.length * 3),
        search: '',
        sortBy: 'Id',
        sortDirection: 'asc',
        filterLogic: 'or',
        filters: chunk.map((code) => ({
          column: 'ErpStockCode',
          operator: 'eq',
          value: code,
        })),
      });
      for (const row of page.data) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          merged.push(row);
        }
      }
    }
    return merged;
  },

  getListByCodeFilters: async (params: StockCodeFilterListParams): Promise<PagedResponse<StockGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<StockGetDto>>>('/api/Stock/query-by-code-filters', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
      codeFilters: params.codeFilters,
    });

    if (!response.success) {
      throw new Error(response.message || 'Kod filtreli stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Kod filtreli stok listesi verisi alınamadı');
    }

    return normalizePagedResponse(response.data);
  },

  getCodeFilterOptions: async (params?: StockCodeFilterOptionsQuery): Promise<StockCodeFilterOptionsDto> => {
    const response = params
      ? await api.post<ApiResponse<StockCodeFilterOptionsDto>>('/api/Stock/code-filter-options/query', {
        search: params.search ?? '',
        pageSize: params.pageSize ?? 100,
      })
      : await api.get<ApiResponse<StockCodeFilterOptionsDto>>('/api/Stock/code-filter-options');

    if (!response.success) {
      throw new Error(response.message || 'Stok özel kod seçenekleri yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Stok özel kod seçenekleri alınamadı');
    }

    return response.data;
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

  createMirrorStock: async (data: StockCreateDto): Promise<StockGetDto> => {
    const response = await api.post<ApiResponse<StockGetDto>>('/api/Stock', data);

    if (!response.success) {
      throw new Error(response.message || response.exceptionMessage || 'Mirror stok oluşturulamadı');
    }

    if (!response.data) {
      throw new Error('Mirror stok cevabı alınamadı');
    }

    return response.data;
  },

  createErpStock: async (id: number): Promise<StockGetDto> => {
    const response = await api.post<ApiResponse<StockGetDto>>(`/api/Stock/${id}/erp-stock`);

    if (!response.success) {
      throw new Error(response.message || response.exceptionMessage || 'Netsis stok kaydı oluşturulamadı');
    }

    if (!response.data) {
      throw new Error('Netsis stok kaydı cevabı alınamadı');
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

  getWarehouseBalancesByStockId: async (stockId: number): Promise<WarehouseStockBalanceDto[]> => {
    if (!stockId || stockId <= 0) {
      return [];
    }

    const response = await api.get<ApiResponse<WarehouseStockBalanceDto[]>>(
      `/api/warehouse-stock-balances/by-stock/${stockId}`,
    );

    if (!response.success) {
      throw new Error(response.message || 'Depo stok bakiyeleri yüklenemedi');
    }

    return response.data ?? [];
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

  toggleFavorite: async (stockId: number, data: StockFavoriteToggleDto): Promise<StockFavoriteToggleResultDto> => {
    const response = await api.post<ApiResponse<StockFavoriteToggleResultDto>>(`/api/Stock/${stockId}/favorite/toggle`, data);

    if (!response.success) {
      throw new Error(response.message || 'Favori durumu güncellenemedi');
    }

    if (!response.data) {
      throw new Error('Favori durumu cevabı alınamadı');
    }

    return response.data;
  },

  getListWithImages: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<StockGetWithMainImageDto>>>('/api/Stock/withImages/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Görselli stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Görselli stok listesi verisi alınamadı');
    }

    return normalizePagedResponse(response.data);
  },

  getListWithImagesByCodeFilters: async (params: StockCodeFilterListParams): Promise<PagedResponse<StockGetWithMainImageDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<StockGetWithMainImageDto>>>('/api/Stock/withImages/query-by-code-filters', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
      codeFilters: params.codeFilters,
    });

    if (!response.success) {
      throw new Error(response.message || 'Kod filtreli görselli stok listesi yüklenemedi');
    }

    if (!response.data) {
      throw new Error('Kod filtreli görselli stok listesi verisi alınamadı');
    }

    return normalizePagedResponse(response.data);
  },
};
