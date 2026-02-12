import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowApi } from '../api/approval-flow-api';
import { APPROVAL_FLOW_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import type { UpdateApprovalFlowDto, ApprovalFlowDto } from '../types/approval-flow-types';

export const useUpdateApprovalFlow = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateApprovalFlowDto }) =>
      approvalFlowApi.update(id, data),
    onSuccess: (updatedApprovalFlow: ApprovalFlowDto) => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedApprovalFlow.id) });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalFlow.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlow.messages.updateError'));
    },
  });
};
