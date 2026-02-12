import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { countryApi } from '../api/country-api';
import { queryKeys, COUNTRY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateCountryDto, CountryDto } from '../types/country-types';

export const useUpdateCountry = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCountryDto }) => {
      const result = await countryApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedCountry: CountryDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [COUNTRY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedCountry.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('countryManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('countryManagement.messages.updateError'));
    },
  });
};
