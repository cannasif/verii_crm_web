import { useQuery } from '@tanstack/react-query';
import { documentSerialTypeApi } from '../api/document-serial-type-api';
import { documentSerialTypeQueryKeys } from '../utils/query-keys';
import type { CustomerDocumentSerialDocumentKind } from '../types/document-serial-type-types';

export function useCustomerDocumentSerialSuggestion(
  customerId: number | null | undefined,
  documentKind: CustomerDocumentSerialDocumentKind | null | undefined,
  requestBranchCode?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: documentSerialTypeQueryKeys.customerSuggestion(
      customerId ?? 0,
      documentKind ?? 0,
      requestBranchCode,
    ),
    queryFn: () =>
      documentSerialTypeApi.getCustomerSuggestion(
        customerId ?? 0,
        documentKind as CustomerDocumentSerialDocumentKind,
        requestBranchCode,
      ),
    enabled: enabled && !!customerId && customerId > 0 && !!documentKind,
    staleTime: 30_000,
  });
}
