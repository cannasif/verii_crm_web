import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalRoleApi } from '../api/approval-role-api';
import { approvalRoleQueryKeys, APPROVAL_ROLE_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteApprovalRole = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approvalRoleApi.delete(id),
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
      toast.success(t('approvalRole.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalRole.messages.deleteError'));
    },
  });
};
