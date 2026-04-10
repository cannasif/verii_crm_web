import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogStockItemDto, StockCategoryCreateDto } from '../types/category-definition-types';

export const useCreateStockCategoryAssignment = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<CatalogStockItemDto, Error, StockCategoryCreateDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.createStockCategoryAssignment(catalogId!, catalogCategoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'stocks', catalogId ?? null, catalogCategoryId ?? null], exact: false });
      toast.success(t('categoryDefinitions.messages.stockAssignSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.stockAssignError'));
    },
  });
};
