import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalRoleGroupApi } from '../api/approval-role-group-api';
import { approvalRoleGroupQueryKeys, APPROVAL_ROLE_GROUP_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateApprovalRoleGroupDto, ApprovalRoleGroupDto } from '../types/approval-role-group-types';

export const useUpdateApprovalRoleGroup = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateApprovalRoleGroupDto }) =>
      approvalRoleGroupApi.update(id, data),
    onSuccess: (updatedGroup: ApprovalRoleGroupDto) => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: approvalRoleGroupQueryKeys.detail(updatedGroup.id) });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalRoleGroup.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalRoleGroup.messages.updateError'));
    },
  });
};
