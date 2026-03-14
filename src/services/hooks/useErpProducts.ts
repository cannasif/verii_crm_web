import { useQuery } from '@tanstack/react-query';
import { erpCommonApi } from '../erp-common-api';
import type { ErpProduct } from '../erp-types';
import { filterAndRankErpProducts } from '../utils/filterErpProducts';

export const useErpProducts = (search?: string) => {
  return useQuery<ErpProduct[]>({
    queryKey: ['erpProducts', search || 'all'],
    queryFn: () => erpCommonApi.getProducts(),
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      if (!search) return data;
      return filterAndRankErpProducts(data, search);
    },
  });
};
