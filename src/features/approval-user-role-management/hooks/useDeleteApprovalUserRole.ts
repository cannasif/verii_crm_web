import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { approvalUserRoleApi } from '../api/approval-user-role-api';
import { APPROVAL_USER_ROLE_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteApprovalUserRole = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approvalUserRoleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.refetchQueries({ 
        queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('approvalUserRole.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('approvalUserRole.messages.deleteError'));
    },
  });
};
