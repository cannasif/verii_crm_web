import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useDeleteCatalog = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: (id) => categoryDefinitionsApi.deleteCatalog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'catalogs'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['category-definitions', 'categories'], exact: false });
      toast.success(t('categoryDefinitions.messages.catalogDeleteSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.catalogDeleteError'));
    },
  });
};
