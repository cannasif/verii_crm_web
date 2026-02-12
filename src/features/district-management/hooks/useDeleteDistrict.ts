import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { districtApi } from '../api/district-api';
import { queryKeys, DISTRICT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteDistrict = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => districtApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('districtManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('districtManagement.messages.deleteError'));
    },
  });
};
