import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowApi } from '../api/approval-flow-api';
import { APPROVAL_FLOW_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteApprovalFlow = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approvalFlowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalFlow.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlow.messages.deleteError'));
    },
  });
};
