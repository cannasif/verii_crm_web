import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowStepApi } from '../api/approval-flow-step-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalFlowStepUpdateDto, ApprovalFlowStepGetDto } from '../types/approval-flow-step-types';

export const useUpdateApprovalFlowStep = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalFlowStepUpdateDto }) =>
      approvalFlowStepApi.update(id, data),
    onSuccess: (updatedStep: ApprovalFlowStepGetDto) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps(updatedStep.approvalFlowId),
      });
      toast.success(t('approvalFlowStep.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlowStep.messages.updateError'));
    },
  });
};
