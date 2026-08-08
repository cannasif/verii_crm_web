import { useQuery } from '@tanstack/react-query';
import { getDashboardSalesDocumentDetail } from '../api/dashboard-sales-document-detail-api';
import type { DashboardSalesDocumentType } from '../types/dashboard-sales-calendar';

export function useDashboardSalesDocumentDetail(
  documentType: DashboardSalesDocumentType,
  documentId: number | null,
) {
  return useQuery({
    queryKey: ['dashboard', 'sales-calendar', 'detail', documentType, documentId],
    queryFn: () => getDashboardSalesDocumentDetail(documentType, documentId!),
    enabled: documentId !== null,
    staleTime: 5 * 60_000,
  });
}
