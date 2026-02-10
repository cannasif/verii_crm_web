import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { pdfReportTemplateApi, pdfReportTemplateQueryKeys } from '@/features/pdf-report';
import type {
  ReportTemplateGetDto,
  PdfReportTemplateListParams,
} from '@/features/pdf-report';

const STALE_TIME_MS = 2 * 60 * 1000;

export function usePdfReportTemplateList(
  params?: PdfReportTemplateListParams
): UseQueryResult<{ items: ReportTemplateGetDto[]; totalCount: number }, Error> {
  return useQuery({
    queryKey: pdfReportTemplateQueryKeys.list(params),
    queryFn: async () => {
      const result = await pdfReportTemplateApi.getList(params);
      return { items: result.items, totalCount: result.totalCount };
    },
    staleTime: STALE_TIME_MS,
  });
}
