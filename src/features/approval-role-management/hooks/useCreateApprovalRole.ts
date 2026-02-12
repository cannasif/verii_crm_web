import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalRoleApi } from '../api/approval-role-api';
import { approvalRoleQueryKeys, APPROVAL_ROLE_QUERY_KEYS } from '../utils/query-keys';
import type { CreateApprovalRoleDto } from '../types/approval-role-types';

export const useCreateApprovalRole = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalRoleDto) => approvalRoleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: approvalRoleQueryKeys.options() });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalRole.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalRole.messages.createError'));
    },
  });
};
