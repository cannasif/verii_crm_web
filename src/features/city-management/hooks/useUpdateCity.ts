import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cityApi } from '../api/city-api';
import { queryKeys, CITY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateCityDto, CityDto } from '../types/city-types';

export const useUpdateCity = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCityDto }) =>
      cityApi.update(id, data),
    onSuccess: (updatedCity: CityDto) => {
      queryClient.invalidateQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedCity.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('cityManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('cityManagement.messages.updateError'));
    },
  });
};
