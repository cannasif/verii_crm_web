import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  type ReportTemplateGetDto,
  type ReportTemplateUpdateDto,
} from '@/features/pdf-report';

export function useUpdatePdfReportTemplate(): ReturnType<
  typeof useMutation<ReportTemplateGetDto, Error, { id: number; data: ReportTemplateUpdateDto }>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReportTemplateUpdateDto }) =>
      pdfReportTemplateApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.item(updated.id) });
    },
  });
}
