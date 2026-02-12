import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { countryApi } from '../api/country-api';
import { queryKeys, COUNTRY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateCountryDto } from '../types/country-types';

export const useCreateCountry = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCountryDto) => {
      const result = await countryApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [COUNTRY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('countryManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('countryManagement.messages.createError'));
    },
  });
};
