import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalRoleGroupApi } from '../api/approval-role-group-api';
import { APPROVAL_ROLE_GROUP_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteApprovalRoleGroup = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approvalRoleGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalRoleGroup.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalRoleGroup.messages.deleteError'));
    },
  });
};
