import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogCategoryFavoriteToggleDto, CatalogCategoryFavoriteToggleResultDto } from '../types/category-definition-types';

export const useToggleCatalogCategoryFavorite = (
  catalogId?: number | null
): UseMutationResult<
  CatalogCategoryFavoriteToggleResultDto,
  Error,
  { catalogCategoryId: number; data: CatalogCategoryFavoriteToggleDto }
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: ({ catalogCategoryId, data }) =>
      categoryDefinitionsApi.toggleCatalogCategoryFavorite(catalogId!, catalogCategoryId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'favorites', catalogId ?? null], exact: false });
      toast.success(
        result.isFavorite
          ? t('categoryDefinitions.messages.categoryFavoriteAddSuccess')
          : t('categoryDefinitions.messages.categoryFavoriteRemoveSuccess')
      );
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.favoriteToggleError'));
    },
  });
};
