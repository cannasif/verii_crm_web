import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { districtApi } from '../api/district-api';
import { queryKeys, DISTRICT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateDistrictDto, DistrictDto } from '../types/district-types';

export const useUpdateDistrict = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDistrictDto }) =>
      districtApi.update(id, data),
    onSuccess: (updatedDistrict: DistrictDto) => {
      queryClient.invalidateQueries({ 
        queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedDistrict.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('districtManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('districtManagement.messages.updateError'));
    },
  });
};
