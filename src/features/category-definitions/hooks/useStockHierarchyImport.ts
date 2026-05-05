import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type {
  CatalogStockHierarchyImportPreviewDto,
  CatalogStockHierarchyImportRequestDto,
  CatalogStockHierarchyImportResultDto,
} from '../types/category-definition-types';

export const usePreviewStockHierarchyImport = (
  catalogId?: number | null
): UseMutationResult<CatalogStockHierarchyImportPreviewDto, Error, CatalogStockHierarchyImportRequestDto> => {
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.previewStockHierarchyImport(catalogId!, data),
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.stockHierarchyPreviewError'));
    },
  });
};

export const useApplyStockHierarchyImport = (
  catalogId?: number | null
): UseMutationResult<CatalogStockHierarchyImportResultDto, Error, CatalogStockHierarchyImportRequestDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.applyStockHierarchyImport(catalogId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions'], exact: false });
      toast.success(t('categoryDefinitions.messages.stockHierarchyApplySuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.stockHierarchyApplyError'));
    },
  });
};
