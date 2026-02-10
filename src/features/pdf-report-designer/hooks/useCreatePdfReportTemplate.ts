import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  type ReportTemplateCreateDto,
  type ReportTemplateGetDto,
} from '@/features/pdf-report';

export function useCreatePdfReportTemplate(): ReturnType<
  typeof useMutation<ReportTemplateGetDto, Error, ReportTemplateCreateDto>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportTemplateCreateDto) => pdfReportTemplateApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.list() });
    },
  });
}
