import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalUserRoleApi } from '../api/approval-user-role-api';
import { approvalUserRoleQueryKeys, APPROVAL_USER_ROLE_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateApprovalUserRoleDto, ApprovalUserRoleDto } from '../types/approval-user-role-types';

export const useUpdateApprovalUserRole = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateApprovalUserRoleDto }) =>
      approvalUserRoleApi.update(id, data),
    onSuccess: (updatedUserRole: ApprovalUserRoleDto) => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: approvalUserRoleQueryKeys.detail(updatedUserRole.id) });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalUserRole.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalUserRole.messages.updateError'));
    },
  });
};
