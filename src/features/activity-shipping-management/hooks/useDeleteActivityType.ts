import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityTypeApi } from '../api/activity-type-api';
import { queryKeys, ACTIVITY_TYPE_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteActivityType = () => {
  const { t } = useTranslation('activity-shipping-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => activityTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityShippings'], exact: false });
      queryClient.invalidateQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('activityType.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('activityType.messages.deleteError'));
    },
  });
};
