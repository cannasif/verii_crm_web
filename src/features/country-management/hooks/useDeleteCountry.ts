import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { countryApi } from '../api/country-api';
import { queryKeys, COUNTRY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteCountry = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await countryApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [COUNTRY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('countryManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('countryManagement.messages.deleteError'));
    },
  });
};
