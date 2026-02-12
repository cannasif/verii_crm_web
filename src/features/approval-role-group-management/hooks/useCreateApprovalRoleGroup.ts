import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalRoleGroupApi } from '../api/approval-role-group-api';
import { APPROVAL_ROLE_GROUP_QUERY_KEYS } from '../utils/query-keys';
import type { CreateApprovalRoleGroupDto } from '../types/approval-role-group-types';

export const useCreateApprovalRoleGroup = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalRoleGroupDto) => approvalRoleGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalRoleGroup.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalRoleGroup.messages.createError'));
    },
  });
};
