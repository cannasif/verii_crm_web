import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingApi } from '../api/product-pricing-api';
import { PRODUCT_PRICING_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteProductPricing = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await productPricingApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('productPricingManagement.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingManagement.deleteError'));
    },
  });
};
