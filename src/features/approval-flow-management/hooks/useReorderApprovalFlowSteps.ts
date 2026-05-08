import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowStepApi } from '../api/approval-flow-step-api';
import { queryKeys } from '../utils/query-keys';
import type {
  ApprovalFlowStepGetDto,
  ApprovalFlowStepReorderDto,
} from '../types/approval-flow-step-types';

export const useReorderApprovalFlowSteps = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApprovalFlowStepReorderDto) => approvalFlowStepApi.reorder(data),
    onSuccess: (updatedSteps: ApprovalFlowStepGetDto[]) => {
      const approvalFlowId = updatedSteps[0]?.approvalFlowId;
      if (approvalFlowId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.steps(approvalFlowId),
        });
      }
      toast.success(t('approvalFlowStep.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlowStep.messages.updateError'));
    },
  });
};
