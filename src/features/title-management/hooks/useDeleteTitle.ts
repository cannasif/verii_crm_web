import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { titleApi } from '../api/title-api';
import { queryKeys, TITLE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteTitle = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => titleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [TITLE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [TITLE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('titleManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('titleManagement.messages.deleteError'));
    },
  });
};
