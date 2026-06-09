import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentSerialTypeApi } from '../api/document-serial-type-api';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const useDeleteDocumentSerialType = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('document-serial-type-management');

  return useMutation({
    mutationFn: (id: number) => documentSerialTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_SERIAL_TYPE_QUERY_KEYS.LIST] });
      toast.success(t('messages.deleteSuccess', { defaultValue: 'Başarıyla silindi' }));
    },
    onError: () => {
      toast.error(t('messages.deleteError', { defaultValue: 'Silinirken hata oluştu' }));
    },
  });
};
