import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { ProductCategoryRuleCreateDto, ProductCategoryRuleDto } from '../types/category-definition-types';

export const useCreateCategoryRule = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<ProductCategoryRuleDto, Error, ProductCategoryRuleCreateDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.createCategoryRule(catalogId!, catalogCategoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'rules', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.ruleCreateSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.ruleCreateError'));
    },
  });
};
