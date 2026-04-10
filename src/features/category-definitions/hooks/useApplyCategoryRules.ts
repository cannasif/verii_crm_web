import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CategoryRuleApplyResultDto } from '../types/category-definition-types';

export const useApplyCategoryRules = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<CategoryRuleApplyResultDto, Error, void> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: () => categoryDefinitionsApi.applyCategoryRules(catalogId!, catalogCategoryId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'rules', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.ruleApplySuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.ruleApplyError'));
    },
  });
};
