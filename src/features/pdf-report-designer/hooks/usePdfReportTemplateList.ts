import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { pdfReportTemplateApi, pdfReportTemplateQueryKeys } from '@/features/pdf-report';
import type {
  ReportTemplateListItemDto,
  PdfReportTemplateListParams,
} from '@/features/pdf-report';

const STALE_TIME_MS = 2 * 60 * 1000;

export function usePdfReportTemplateList(
  params?: PdfReportTemplateListParams
): UseQueryResult<{ items: ReportTemplateListItemDto[]; totalCount: number; pageNumber: number; pageSize: number; totalPages: number }, Error> {
  return useQuery({
    queryKey: pdfReportTemplateQueryKeys.list(params),
    queryFn: async () => {
      const result = await pdfReportTemplateApi.getList(params);
      return result;
    },
    staleTime: STALE_TIME_MS,
  });
}
