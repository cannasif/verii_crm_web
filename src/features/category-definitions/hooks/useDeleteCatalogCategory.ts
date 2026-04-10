import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useDeleteCatalogCategory = (
  catalogId?: number | null
): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (catalogCategoryId) => categoryDefinitionsApi.deleteCatalogCategory(catalogId!, catalogCategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.categoryDeleteSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.categoryDeleteError'));
    },
  });
};
