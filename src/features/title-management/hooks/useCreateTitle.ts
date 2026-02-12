import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { titleApi } from '../api/title-api';
import { queryKeys, TITLE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateTitleDto, TitleDto } from '../types/title-types';

export const useCreateTitle = (): UseMutationResult<TitleDto, Error, CreateTitleDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTitleDto) => titleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [TITLE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.refetchQueries({ 
        queryKey: [TITLE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('titleManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('titleManagement.messages.createError'));
    },
  });
};
