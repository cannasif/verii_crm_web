import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';
import type { UploadActivityImagesPayload } from '../types/activity-image-types';

export function useUploadActivityImages(activityId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: UploadActivityImagesPayload) => activityImageApi.upload(activityId, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: activityImageKeys.byActivity(activityId) });
      const count = data.length;
      toast.success(
        t('activity-image:uploadSuccess', '{{count}} resim başarıyla yüklendi', { count })
      );
    },
    onError: (error: Error) => {
      toast.error(t('activity-image:uploadError', 'Resimler yüklenemedi'), {
        description: error.message,
      });
    },
  });
}
