import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { pdfReportTemplateApi, pdfReportTemplateQueryKeys } from '@/features/pdf-report';
import type { ReportTemplateGetDto } from '@/features/pdf-report';

const STALE_TIME_MS = 2 * 60 * 1000;

export function usePdfReportTemplateById(
  id: number | null | undefined
): UseQueryResult<ReportTemplateGetDto, Error> {
  return useQuery({
    queryKey: pdfReportTemplateQueryKeys.item(id ?? 0),
    queryFn: () => pdfReportTemplateApi.getById(id!),
    enabled: typeof id === 'number' && id > 0,
    staleTime: STALE_TIME_MS,
  });
}
