import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  type PdfTablePresetCreateDto,
  type PdfTablePresetDto,
} from '@/features/pdf-report';

export function useCreatePdfTablePreset(): ReturnType<
  typeof useMutation<PdfTablePresetDto, Error, PdfTablePresetCreateDto>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PdfTablePresetCreateDto) => pdfReportTemplateApi.createPreset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.presetList() });
    },
  });
}
