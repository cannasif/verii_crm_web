import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { customerDedupeApi } from '../api/customerDedupeApi';
import type { CustomerMergeRequestDto } from '../types/customerDedupe.types';
import { CANDIDATES_QUERY_KEY } from './useDuplicateCandidatesQuery';
import { CUSTOMER_MANAGEMENT_QUERY_KEYS } from '@/features/customer-management/utils/query-keys';

export function useMergeCustomersMutation(): ReturnType<
  typeof useMutation<
    Awaited<ReturnType<typeof customerDedupeApi.mergeCustomers>>,
    Error,
    CustomerMergeRequestDto
  >
> {
  const { t } = useTranslation(['customerDedupe', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerMergeRequestDto) => customerDedupeApi.mergeCustomers(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST] });
      toast.success(t('customerDedupe:mergeSuccess', 'Merge completed successfully.'));
    },
    onError: (error: Error) => {
      const message =
        error?.message ||
        t('customerDedupe:mergeError', 'Merge failed. Please try again.');
      toast.error(message);
    },
  });
}
