import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingApi } from '../api/product-pricing-api';
import { PRODUCT_PRICING_QUERY_KEYS } from '../utils/query-keys';
import type { CreateProductPricingDto, ProductPricingGetDto } from '../types/product-pricing-types';

export const useCreateProductPricing = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductPricingDto): Promise<ProductPricingGetDto> => {
      const result = await productPricingApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('productPricingManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingManagement.createError'));
    },
  });
};
