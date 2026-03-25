import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityTypeApi } from '../api/activity-type-api';
import { queryKeys, ACTIVITY_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { CreateActivityTypeDto } from '../types/activity-type-types';

export const useCreateActivityType = () => {
  const { t } = useTranslation('activity-topic-purpose-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateActivityTypeDto) => activityTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityTopicPurposes'], exact: false });
      queryClient.invalidateQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('activityType.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('activityType.messages.createError'));
    },
  });
};
