import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cityApi } from '../api/city-api';
import { queryKeys, CITY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteCity = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cityApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('cityManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('cityManagement.messages.deleteError'));
    },
  });
};
