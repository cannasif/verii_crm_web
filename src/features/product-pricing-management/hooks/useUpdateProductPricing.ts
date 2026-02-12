import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingApi } from '../api/product-pricing-api';
import { queryKeys, PRODUCT_PRICING_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateProductPricingDto, ProductPricingGetDto } from '../types/product-pricing-types';

export const useUpdateProductPricing = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProductPricingDto }): Promise<ProductPricingGetDto> => {
      const result = await productPricingApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedProductPricing: ProductPricingGetDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedProductPricing.id) });
      toast.success(t('productPricingManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingManagement.updateError'));
    },
  });
};
