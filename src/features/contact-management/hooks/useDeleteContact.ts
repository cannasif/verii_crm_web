import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { contactApi } from '../api/contact-api';
import { queryKeys, CONTACT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteContact = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await contactApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CONTACT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('contactManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('contactManagement.messages.deleteError'));
    },
  });
};
