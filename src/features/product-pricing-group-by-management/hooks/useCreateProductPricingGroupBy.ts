import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingGroupByApi } from '../api/product-pricing-group-by-api';
import { PRODUCT_PRICING_GROUP_BY_QUERY_KEYS } from '../utils/query-keys';
import type { CreateProductPricingGroupByDto, ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';

export const useCreateProductPricingGroupBy = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductPricingGroupByDto): Promise<ProductPricingGroupByDto> => {
      const result = await productPricingGroupByApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_GROUP_BY_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('productPricingGroupByManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingGroupByManagement.createError'));
    },
  });
};
