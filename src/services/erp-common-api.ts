import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { ErpCustomer, ErpProject, ProjeDto, ErpWarehouse, ErpProduct, BranchErp, CariDto, KurDto, StokGroupDto } from './erp-types';

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
