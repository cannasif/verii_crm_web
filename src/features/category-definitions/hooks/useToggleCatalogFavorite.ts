import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogFavoriteToggleDto, CatalogFavoriteToggleResultDto } from '../types/category-definition-types';

export const useToggleCatalogFavorite = (
  catalogId?: number | null
): UseMutationResult<CatalogFavoriteToggleResultDto, Error, CatalogFavoriteToggleDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.toggleCatalogFavorite(catalogId!, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'favorites', catalogId ?? null], exact: false });
      toast.success(
        result.isFavorite
          ? t('categoryDefinitions.messages.favoriteAddSuccess')
          : t('categoryDefinitions.messages.favoriteRemoveSuccess')
      );
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.favoriteToggleError'));
    },
  });
};
