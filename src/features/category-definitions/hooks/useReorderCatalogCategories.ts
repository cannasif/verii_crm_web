import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogCategoryReorderDto } from '../types/category-definition-types';

export const useReorderCatalogCategories = (
  catalogId?: number | null
): UseMutationResult<void, Error, CatalogCategoryReorderDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.reorderCatalogCategories(catalogId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.categoryReorderSuccess'));
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      toast.error(error.message || t('categoryDefinitions.messages.categoryReorderError'));
    },
  });
};
