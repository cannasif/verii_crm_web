import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowApi } from '../api/approval-flow-api';
import { APPROVAL_FLOW_QUERY_KEYS } from '../utils/query-keys';
import type { CreateApprovalFlowDto } from '../types/approval-flow-types';

export const useCreateApprovalFlow = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalFlowDto) => approvalFlowApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalFlow.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlow.messages.createError'));
    },
  });
};
