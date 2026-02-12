import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { contactApi } from '../api/contact-api';
import { queryKeys, CONTACT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateContactDto } from '../types/contact-types';

export const useCreateContact = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactDto) => {
      const result = await contactApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CONTACT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('contactManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('contactManagement.messages.createError'));
    },
  });
};
