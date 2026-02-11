import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';

export function useDeleteActivityImage(activityId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => activityImageApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityImageKeys.byActivity(activityId) });
      toast.success(t('activity-image:deleteSuccess', 'Resim başarıyla silindi'));
    },
    onError: (error: Error) => {
      toast.error(t('activity-image:deleteError', 'Resim silinemedi'), {
        description: error.message,
      });
    },
  });
}
