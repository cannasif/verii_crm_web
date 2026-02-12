import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingGroupByApi } from '../api/product-pricing-group-by-api';
import { queryKeys, PRODUCT_PRICING_GROUP_BY_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateProductPricingGroupByDto, ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';

export const useUpdateProductPricingGroupBy = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProductPricingGroupByDto }): Promise<ProductPricingGroupByDto> => {
      const result = await productPricingGroupByApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedProductPricingGroupBy: ProductPricingGroupByDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_GROUP_BY_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedProductPricingGroupBy.id) });
      toast.success(t('productPricingGroupByManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingGroupByManagement.updateError'));
    },
  });
};
