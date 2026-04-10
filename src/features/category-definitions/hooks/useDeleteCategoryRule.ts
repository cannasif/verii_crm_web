import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useDeleteCategoryRule = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (ruleId) => categoryDefinitionsApi.deleteCategoryRule(catalogId!, catalogCategoryId!, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'rules', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.ruleDeleteSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.ruleDeleteError'));
    },
  });
};
