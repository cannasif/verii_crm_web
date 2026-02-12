import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowStepApi } from '../api/approval-flow-step-api';
import { queryKeys } from '../utils/query-keys';

export const useDeleteApprovalFlowStep = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; approvalFlowId: number }) =>
      approvalFlowStepApi.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps(variables.approvalFlowId),
      });
      toast.success(t('approvalFlowStep.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlowStep.messages.deleteError'));
    },
  });
};
