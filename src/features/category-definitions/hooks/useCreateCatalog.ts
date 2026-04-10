import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { ProductCatalogCreateDto, ProductCatalogDto } from '../types/category-definition-types';

export const useCreateCatalog = (): UseMutationResult<ProductCatalogDto, Error, ProductCatalogCreateDto> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (data) => categoryDefinitionsApi.createCatalog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'catalogs'], exact: false });
      toast.success(t('categoryDefinitions.messages.catalogCreateSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.catalogCreateError'));
    },
  });
};
