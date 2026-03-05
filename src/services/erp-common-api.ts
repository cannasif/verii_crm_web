import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';
import type { ErpCustomer, ErpProject, ProjeDto, ErpWarehouse, ErpProduct, BranchErp, CariDto, KurDto, StokGroupDto } from './erp-types';

let cachedProjectCodes: ProjeDto[] | null = null;

export const erpCommonApi = {
  getCustomers: async (): Promise<ErpCustomer[]> => {
    const response = await api.get('/api/Erp/getAllCustomers') as ApiResponse<ErpCustomer[]>;
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
    const url = `/api/Erp/getAllCustomers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get(url) as ApiResponse<CariDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'ERP müşterileri yüklenemedi');
  },

  getProjects: async (): Promise<ErpProject[]> => {
    const response = await api.get('/api/Erp/getAllProjects') as ApiResponse<ErpProject[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Projeler yüklenemedi');
  },

  getProjectCodes: async (): Promise<ProjeDto[]> => {
    const response = await api.get<ApiResponse<ProjeDto[]>>('/api/Erp/getProjectCodes');
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
      const response = await api.get<ApiResponse<ProjeDto[]>>('/api/Erp/getProjectCodes', { signal: params.signal });
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Proje kodları yüklenemedi');
      }
      cachedProjectCodes = response.data;
    }
    let filtered = cachedProjectCodes;
    if (filters && Array.isArray(filters)) {
      const searchFilter = filters.find((f: PagedFilter) => f.column === 'search' || f.column === 'projeKod' || f.column === 'projeAciklama');
      const searchTerm = searchFilter?.value?.toLowerCase() ?? '';
      if (searchTerm) {
        filtered = filtered.filter(
          (p) =>
            (p.projeKod?.toLowerCase() ?? '').includes(searchTerm) ||
            (p.projeAciklama?.toLowerCase() ?? '').includes(searchTerm)
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
    const url = depoKodu 
      ? `/api/Erp/getAllWarehouses?depoKodu=${depoKodu}`
      : '/api/Erp/getAllWarehouses';
    const response = await api.get(url) as ApiResponse<ErpWarehouse[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Depolar yüklenemedi');
  },

  getProducts: async (): Promise<ErpProduct[]> => {
    const response = await api.get('/api/Erp/getAllProducts') as ApiResponse<ErpProduct[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Stoklar yüklenemedi');
  },

  getBranches: async (): Promise<BranchErp[]> => {
    const response = await api.get('/api/Erp/getBranches') as ApiResponse<BranchErp[]>;
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
    const url = `/api/Erp/getExchangeRate?tarih=${dateString}&fiyatTipi=${fiyatTipi}`;
    const response = await api.get(url) as ApiResponse<KurDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Döviz kurları yüklenemedi');
  },

  getStokGroup: async (grupKodu?: string): Promise<StokGroupDto[]> => {
    const grupKoduParam = grupKodu && grupKodu.trim() !== '' ? grupKodu : '';
    const url = `/api/Erp/getStokGroup?grupKodu=${encodeURIComponent(grupKoduParam)}`;
    const response = await api.get(url) as ApiResponse<StokGroupDto[]>;
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Stok grupları yüklenemedi');
  },
};
