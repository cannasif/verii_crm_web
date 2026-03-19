import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { pdfReportTemplateApi, pdfReportTemplateQueryKeys } from '@/features/pdf-report';
import type { PdfTablePresetDto, PdfTablePresetListParams } from '@/features/pdf-report';

const STALE_TIME_MS = 2 * 60 * 1000;

export function usePdfTablePresetList(
  params?: PdfTablePresetListParams
): UseQueryResult<{ items: PdfTablePresetDto[]; totalCount: number }, Error> {
  return useQuery({
    queryKey: pdfReportTemplateQueryKeys.presetList(params),
    queryFn: async () => {
      const result = await pdfReportTemplateApi.getPresetList(params);
      return { items: result.items, totalCount: result.totalCount };
    },
    staleTime: STALE_TIME_MS,
  });
}
