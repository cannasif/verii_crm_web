import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  type PdfTablePresetDto,
  type PdfTablePresetUpdateDto,
} from '@/features/pdf-report';

export function useUpdatePdfTablePreset(): ReturnType<
  typeof useMutation<PdfTablePresetDto, Error, { id: number; data: PdfTablePresetUpdateDto }>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => pdfReportTemplateApi.updatePreset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.presetList() });
    },
  });
}
