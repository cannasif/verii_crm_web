import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogCategoryNodeDto, CatalogCategoryUpdateDto } from '../types/category-definition-types';

export const useUpdateCatalogCategory = (
  catalogId?: number | null
): UseMutationResult<CatalogCategoryNodeDto, Error, { catalogCategoryId: number; data: CatalogCategoryUpdateDto }> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: ({ catalogCategoryId, data }) => categoryDefinitionsApi.updateCatalogCategory(catalogId!, catalogCategoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.categoryUpdateSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.categoryUpdateError'));
    },
  });
};
