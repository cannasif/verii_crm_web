import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { contactApi } from '../api/contact-api';
import { queryKeys, CONTACT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateContactDto, ContactDto } from '../types/contact-types';

export const useUpdateContact = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateContactDto }) => {
      const result = await contactApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedContact: ContactDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [CONTACT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedContact.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('contactManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('contactManagement.messages.updateError'));
    },
  });
};
