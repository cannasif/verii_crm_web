import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalFlowStepApi } from '../api/approval-flow-step-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalFlowStepCreateDto } from '../types/approval-flow-step-types';

export const useCreateApprovalFlowStep = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApprovalFlowStepCreateDto) => approvalFlowStepApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps(variables.approvalFlowId),
      });
      toast.success(t('approvalFlowStep.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalFlowStep.messages.createError'));
    },
  });
};
