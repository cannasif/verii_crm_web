import { useQuery } from '@tanstack/react-query';
import { erpCommonApi } from '../erp-common-api';
import type { ErpProduct } from '../erp-types';

export const useErpProducts = (search?: string) => {
  return useQuery<ErpProduct[]>({
    queryKey: ['erpProducts', search || 'all'],
    queryFn: () => erpCommonApi.getProducts(),
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      if (!search) return data;
      const searchLower = search.toLowerCase();
      return data.filter(
        (product) =>
          product.stokKodu.toLowerCase().includes(searchLower) ||
          product.stokAdi.toLowerCase().includes(searchLower) ||
          product.grupKodu.toLowerCase().includes(searchLower) ||
          product.grupAdi?.toLowerCase().includes(searchLower) ||
          product.kod1?.toLowerCase().includes(searchLower) ||
          product.kod1Adi?.toLowerCase().includes(searchLower) ||
          product.kod2?.toLowerCase().includes(searchLower) ||
          product.kod2Adi?.toLowerCase().includes(searchLower)
      );
    },
  });
};
