import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cityApi } from '../api/city-api';
import { queryKeys, CITY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateCityDto } from '../types/city-types';

export const useCreateCity = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCityDto) => cityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [CITY_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('cityManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('cityManagement.messages.createError'));
    },
  });
};
