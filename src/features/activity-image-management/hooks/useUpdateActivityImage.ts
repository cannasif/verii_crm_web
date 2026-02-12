import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';
import type { UpdateActivityImageDto } from '../types/activity-image-types';

export function useUpdateActivityImage(activityId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateActivityImageDto }) => 
      activityImageApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityImageKeys.byActivity(activityId) });
      toast.success(t('activity-image:updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(t('activity-image:updateError'), {
        description: error.message,
      });
    },
  });
}
