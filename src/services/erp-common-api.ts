import { api } from '@/lib/axios';
import { matchesSearchTerm } from '@/lib/search';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';
import type { ErpCustomer, ErpProject, ProjeDto, SpecialCodeDto, ErpWarehouse, ErpProduct, BranchErp, CariDto, KurDto, StokGroupDto } from './erp-types';

let cachedProjectCodes: ProjeDto[] | null = null;
const cachedSpecialCodesByType: Partial<Record<1 | 2, SpecialCodeDto[]>> = {};

function normalizeErpWarehouse(item: unknown): ErpWarehouse | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const row = item as Record<string, unknown>;
  const rawCode =
    row.depoKodu ??
    row.DepoKodu ??
    row.warehouseCode ??
    row.WarehouseCode ??
    row.code ??
    row.Code;
  const rawName =
    row.depoIsmi ??
    row.DepoIsmi ??
    row.warehouseName ??
    row.WarehouseName ??
    row.name ??
    row.Name ??
    '';
  const depoKodu = typeof rawCode === 'number' ? rawCode : Number(rawCode);

  if (!Number.isFinite(depoKodu)) {
    return null;
  }

  return {
    depoKodu,
    depoIsmi: String(rawName ?? '').trim(),
  };
}

function extractWarehouseRows(payload: unknown): ErpWarehouse[] {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeErpWarehouse)
      .filter((warehouse): warehouse is ErpWarehouse => warehouse != null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as Record<string, unknown>;
  if (Array.isArray(envelope.data)) {
    return extractWarehouseRows(envelope.data);
  }

  const nestedData = envelope.data;
  if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
    const paged = nestedData as Record<string, unknown>;
    if (Array.isArray(paged.data)) {
      return extractWarehouseRows(paged.data);
    }
  }

  return [];
}

function dedupeWarehouses(warehouses: ErpWarehouse[]): ErpWarehouse[] {
  const map = new Map<number, ErpWarehouse>();
  warehouses.forEach((warehouse) => {
    const existing = map.get(warehouse.depoKodu);
    if (!existing || (!existing.depoIsmi && warehouse.depoIsmi)) {
      map.set(warehouse.depoKodu, warehouse);
    }
  });
  return [...map.values()].sort((a, b) => a.depoKodu - b.depoKodu);
}

async function fetchWarehousesFromNetsis(depoKodu?: number): Promise<ErpWarehouse[]> {
  const query = depoKodu != null ? `?depoKodu=${depoKodu}` : '';
  const response = await api.get(`/api/NetsisRead/getWarehouses${query}`);
  const warehouses = dedupeWarehouses(extractWarehouseRows(response));

  if (Array.isArray(response)) {
    return warehouses;
  }

  const envelope = response as ApiResponse<unknown>;
  if (envelope.success !== false) {
    return warehouses;
  }

  throw new Error(envelope.message || 'Depolar yüklenemedi');
}

async function fetchWarehousesFromCrmQuery(): Promise<ErpWarehouse[]> {
  const response = await api.post<ApiResponse<PagedResponse<unknown>>>('/api/Warehouse/query', {
    pageNumber: 1,
    pageSize: 500,
    sortBy: 'Id',
    sortDirection: 'asc',
  });

  if (!response.success) {
    throw new Error(response.message || 'Depolar yüklenemedi');
  }

  return dedupeWarehouses(extractWarehouseRows(response.data));
}

export const erpCommonApi = {
  getCustomers: async (): Promise<ErpCustomer[]> => {
    const response = await api.get('/api/NetsisRead/getAllCustomers') as ApiResponse<ErpCustomer[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Cariler yüklenemedi');
  },

  getCaris: async (cariKodu?: string | null): Promise<CariDto[]> => {
    const queryParams = new URLSearchParams();
    if (cariKodu) {
      queryParams.append('cariKodu', cariKodu);
    }
    const url = `/api/NetsisRead/getAllCustomers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get(url) as ApiResponse<CariDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'ERP müşterileri yüklenemedi');
  },

  getProjects: async (): Promise<ErpProject[]> => {
    const response = await api.get('/api/NetsisRead/getProjectCodes') as ApiResponse<ErpProject[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Projeler yüklenemedi');
  },

  getProjectCodes: async (): Promise<ProjeDto[]> => {
    const response = await api.get<ApiResponse<ProjeDto[]>>('/api/NetsisRead/getProjectCodes');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Proje kodları yüklenemedi');
  },

  getProjectCodesPage: async (params: {
    pageNumber: number;
    pageSize: number;
    filters?: PagedFilter[] | Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<PagedResponse<ProjeDto>> => {
    const { pageNumber, pageSize, filters } = params;
    if (!cachedProjectCodes) {
      const response = await api.get<ApiResponse<ProjeDto[]>>('/api/NetsisRead/getProjectCodes', { signal: params.signal });
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Proje kodları yüklenemedi');
      }
      cachedProjectCodes = response.data;
    }
    let filtered = cachedProjectCodes;
    if (filters && Array.isArray(filters)) {
      const searchFilter = filters.find((f: PagedFilter) => f.column === 'search' || f.column === 'projeKod' || f.column === 'projeAciklama');
      const searchTerm = String(searchFilter?.value ?? '');
      if (searchTerm) {
        filtered = filtered.filter(
          (p) => matchesSearchTerm(searchTerm, [p.projeKod, p.projeAciklama])
        );
      }
    }
    const totalCount = filtered.length;
    const start = (pageNumber - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);
    return {
      data,
      totalCount,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: start + data.length < totalCount,
    };
  },

  getSpecialCodes: async (tableType: 1 | 2, specialCode?: string | null): Promise<SpecialCodeDto[]> => {
    const queryParams = new URLSearchParams({ tableType: String(tableType) });
    if (specialCode?.trim()) {
      queryParams.set('specialCode', specialCode.trim());
    }

    const response = await api.get<ApiResponse<SpecialCodeDto[]>>(`/api/NetsisRead/getSpecialCodes?${queryParams.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Özel kodlar yüklenemedi');
  },

  getSpecialCodesPage: async (params: {
    tableType: 1 | 2;
    pageNumber: number;
    pageSize: number;
    filters?: PagedFilter[] | Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<PagedResponse<SpecialCodeDto>> => {
    const { tableType, pageNumber, pageSize, filters } = params;
    if (!cachedSpecialCodesByType[tableType]) {
      cachedSpecialCodesByType[tableType] = await erpCommonApi.getSpecialCodes(tableType);
    }

    let filtered = cachedSpecialCodesByType[tableType] ?? [];
    if (filters && Array.isArray(filters)) {
      const searchFilter = filters.find((f: PagedFilter) => f.column === 'search' || f.column === 'ozelKod' || f.column === 'aciklama');
      const searchTerm = String(searchFilter?.value ?? '');
      if (searchTerm) {
        filtered = filtered.filter(
          (specialCode) => matchesSearchTerm(searchTerm, [
            specialCode.ozelKod,
            specialCode.aciklama,
            specialCode.displayName,
          ])
        );
      }
    }

    const totalCount = filtered.length;
    const start = (pageNumber - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      totalCount,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: start + data.length < totalCount,
    };
  },

  getWarehouses: async (depoKodu?: number): Promise<ErpWarehouse[]> => {
    try {
      return await fetchWarehousesFromNetsis(depoKodu);
    } catch (netsisError) {
      if (depoKodu != null) {
        throw netsisError instanceof Error ? netsisError : new Error('Depolar yüklenemedi');
      }

      try {
        return await fetchWarehousesFromCrmQuery();
      } catch {
        throw netsisError instanceof Error ? netsisError : new Error('Depolar yüklenemedi');
      }
    }
  },

  getProducts: async (): Promise<ErpProduct[]> => {
    const response = await api.get('/api/NetsisRead/getAllProducts') as ApiResponse<ErpProduct[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Stoklar yüklenemedi');
  },

  getBranches: async (): Promise<BranchErp[]> => {
    const response = await api.get('/api/NetsisRead/getBranches') as ApiResponse<BranchErp[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Şubeler yüklenemedi');
  },

  getExchangeRate: async (tarih?: Date, fiyatTipi: number = 1): Promise<KurDto[]> => {
    const date = tarih || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const url = `/api/NetsisRead/getExchangeRate?tarih=${dateString}&fiyatTipi=${fiyatTipi}`;
    const response = await api.get(url) as ApiResponse<KurDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Döviz kurları yüklenemedi');
  },

  getStokGroup: async (grupKodu?: string): Promise<StokGroupDto[]> => {
    const grupKoduParam = grupKodu && grupKodu.trim() !== '' ? grupKodu : '';
    const url = `/api/NetsisRead/getStokGroup?grupKodu=${encodeURIComponent(grupKoduParam)}`;
    const response = await api.get(url) as ApiResponse<StokGroupDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Stok grupları yüklenemedi');
  },
};
