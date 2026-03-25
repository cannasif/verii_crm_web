import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityTypeApi } from '../api/activity-type-api';
import { queryKeys, ACTIVITY_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateActivityTypeDto, ActivityTypeDto } from '../types/activity-type-types';

export const useUpdateActivityType = () => {
  const { t } = useTranslation('activity-meeting-type-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateActivityTypeDto }) =>
      activityTypeApi.update(id, data),
    onSuccess: (updatedActivityType: ActivityTypeDto) => {
      queryClient.invalidateQueries({ queryKey: ['activityMeetingTypes'], exact: false });
      queryClient.invalidateQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedActivityType.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('activityType.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('activityType.messages.updateError'));
    },
  });
};
