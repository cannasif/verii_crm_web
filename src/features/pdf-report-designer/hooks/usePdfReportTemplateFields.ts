import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  type DocumentRuleType,
  type ReportTemplateFieldsDto,
} from '@/features/pdf-report';

const STALE_TIME_MS = 5 * 60 * 1000;

export function usePdfReportTemplateFields(
  ruleType: DocumentRuleType | number | null | undefined
): UseQueryResult<ReportTemplateFieldsDto, Error> {
  return useQuery({
    queryKey: pdfReportTemplateQueryKeys.fields(ruleType ?? 0),
    queryFn: () => pdfReportTemplateApi.getFields(ruleType!),
    enabled: ruleType != null,
    staleTime: STALE_TIME_MS,
  });
}
