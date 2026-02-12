import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { productPricingGroupByApi } from '../api/product-pricing-group-by-api';
import { PRODUCT_PRICING_GROUP_BY_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteProductPricingGroupBy = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await productPricingGroupByApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PRODUCT_PRICING_GROUP_BY_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('productPricingGroupByManagement.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('productPricingGroupByManagement.deleteError'));
    },
  });
};
