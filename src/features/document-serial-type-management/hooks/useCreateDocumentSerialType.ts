import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentSerialTypeApi } from '../api/document-serial-type-api';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { CreateDocumentSerialTypeDto } from '../types/document-serial-type-types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const useCreateDocumentSerialType = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('document-serial-type-management');

  return useMutation({
    mutationFn: (data: CreateDocumentSerialTypeDto) => documentSerialTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_SERIAL_TYPE_QUERY_KEYS.LIST] });
      toast.success(t('messages.createSuccess', { defaultValue: 'Başarıyla oluşturuldu' }));
    },
    onError: () => {
      toast.error(t('messages.createError', { defaultValue: 'Oluşturulurken hata oluştu' }));
    },
  });
};
