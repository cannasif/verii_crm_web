import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface NetsisCustomerDispatchDto {
  tipi?: string | null;
  exportTipi?: string | null;
  irsaliyeNo: string;
  cariKodu: string;
  cariIsim?: string | null;
  tarih?: string | null;
  aciklama?: string | null;
  plasiyerKodu?: string | null;
  plasiyerAciklama?: string | null;
  teslimCariKodu?: string | null;
  teslimCariIsim?: string | null;
}

export interface NetsisCustomerDispatchLineDto {
  fisNo: string;
  cariKodu?: string | null;
  stokKodu: string;
  stokAdi?: string | null;
  miktar: number;
  olcuBr?: string | null;
  teslimMiktari: number;
  bakiye: number;
}

export interface NetsisCustomerDispatchOrderCheckDto {
  cariIsim?: string | null;
  teslimCariIsim?: string | null;
  aciklama?: string | null;
  teslimCariKodu?: string | null;
  siparisNo?: string | null;
  irsaliyeTarihi?: string | null;
  irsaliyeTeslimTarihi?: string | null;
  fatirsNo: string;
}

function ensureSuccess<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.success) {
    return response.data;
  }

  throw new Error(response.message || fallbackMessage);
}

export const ndiApi = {
  getCustomerDispatches: async (): Promise<NetsisCustomerDispatchDto[]> => {
    const response = await api.get<ApiResponse<NetsisCustomerDispatchDto[]>>('/api/NetsisRead/getCustomerDispatches');
    return ensureSuccess(response, 'Netsis irsaliyeleri yuklenemedi.');
  },

  getCustomerDispatchLines: async (irsNoList: string): Promise<NetsisCustomerDispatchLineDto[]> => {
    const response = await api.get<ApiResponse<NetsisCustomerDispatchLineDto[]>>('/api/NetsisRead/getCustomerDispatchLines', {
      params: { irsNoList },
    });
    return ensureSuccess(response, 'Netsis irsaliye kalemleri yuklenemedi.');
  },

  getCustomerDispatchOrderChecks: async (irsNoList: string): Promise<NetsisCustomerDispatchOrderCheckDto[]> => {
    const response = await api.get<ApiResponse<NetsisCustomerDispatchOrderCheckDto[]>>(
      '/api/NetsisRead/getCustomerDispatchOrderChecks',
      {
        params: { irsNoList },
      }
    );
    return ensureSuccess(response, 'Netsis irsaliye siparis kontrolleri yuklenemedi.');
  },
};
