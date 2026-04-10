import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogCategoryCreateDto, CatalogCategoryNodeDto } from '../types/category-definition-types';

export const useCreateCatalogCategory = (
  catalogId?: number | null
): UseMutationResult<CatalogCategoryNodeDto, Error, CatalogCategoryCreateDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.createCatalogCategory(catalogId!, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories', catalogId ?? null], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null], exact: false });
      toast.success(
        variables.parentCatalogCategoryId
          ? t('categoryDefinitions.messages.subCategoryCreateSuccess')
          : t('categoryDefinitions.messages.rootCategoryCreateSuccess')
      );
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.categoryCreateError'));
    },
  });
};
