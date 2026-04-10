import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { ProductCategoryRuleDto, ProductCategoryRuleUpdateDto } from '../types/category-definition-types';

export const useUpdateCategoryRule = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<ProductCategoryRuleDto, Error, { ruleId: number; data: ProductCategoryRuleUpdateDto }> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: ({ ruleId, data }) => categoryDefinitionsApi.updateCategoryRule(catalogId!, catalogCategoryId!, ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'rules', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.ruleUpdateSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.ruleUpdateError'));
    },
  });
};
