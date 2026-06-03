import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { NetsisOrderHeader, NetsisOrderLine } from '../types/erp-order-types';

export const erpOrderApi = {
  getOrders: async (): Promise<NetsisOrderHeader[]> => {
    const response = await api.get<ApiResponse<NetsisOrderHeader[]>>('/api/NetsisRead/getNetsisOrders');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'ERP siparişleri yüklenemedi.');
  },

  getOrderLines: async (fatirsNo: string): Promise<NetsisOrderLine[]> => {
    const response = await api.get<ApiResponse<NetsisOrderLine[]>>('/api/NetsisRead/getNetsisOrderLines', {
      params: { fatirsNo },
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'ERP sipariş kalemleri yüklenemedi.');
  },
};
