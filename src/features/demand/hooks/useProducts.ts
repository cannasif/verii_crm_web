import { useErpProducts } from '@/services/hooks/useErpProducts';
import type { Product } from '../types/demand-types';

interface UseProductsReturn {
  data: Product[];
  isLoading: boolean;
}

export const useProducts = (search?: string): UseProductsReturn => {
  const { data: erpProducts, isLoading: erpLoading } = useErpProducts(search);

  return {
    data:
      erpProducts?.map((product, index) => {
        const subeKodu = product.subeKodu || 0;
        const isletmeKodu = product.isletmeKodu || 0;
        const id = subeKodu * 1000000 + isletmeKodu || index;
        return {
          id: isNaN(id) ? index : id,
          code: product.stokKodu || '',
          name: product.stokAdi || product.grupKodu || '',
          vatRate: 20,
          groupCode: product.grupKodu || '',
        };
      }) || [],
    isLoading: erpLoading,
  };
};
