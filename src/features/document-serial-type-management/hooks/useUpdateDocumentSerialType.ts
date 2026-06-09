import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentSerialTypeApi } from '../api/document-serial-type-api';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateDocumentSerialTypeDto } from '../types/document-serial-type-types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const useUpdateDocumentSerialType = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('document-serial-type-management');

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentSerialTypeDto }) =>
      documentSerialTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_SERIAL_TYPE_QUERY_KEYS.LIST] });
      toast.success(t('messages.updateSuccess', { defaultValue: 'Başarıyla güncellendi' }));
    },
    onError: () => {
      toast.error(t('messages.updateError', { defaultValue: 'Güncellenirken hata oluştu' }));
    },
  });
};
