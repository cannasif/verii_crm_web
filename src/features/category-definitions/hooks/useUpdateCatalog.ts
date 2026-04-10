import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { ProductCatalogDto, ProductCatalogUpdateDto } from '../types/category-definition-types';

export const useUpdateCatalog = (): UseMutationResult<
  ProductCatalogDto,
  Error,
  { id: number; data: ProductCatalogUpdateDto }
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: ({ id, data }) => categoryDefinitionsApi.updateCatalog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'catalogs'], exact: false });
      toast.success(t('categoryDefinitions.messages.catalogUpdateSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.catalogUpdateError'));
    },
  });
};
