import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { pdfReportTemplateApi } from '@/features/pdf-report';

export function useGeneratePdfReportDocument(): UseMutationResult<
  Blob,
  Error,
  { templateId: number; entityId: number }
> {
  return useMutation({
    mutationFn: ({ templateId, entityId }) =>
      pdfReportTemplateApi.generateDocument(templateId, entityId),
  });
}
