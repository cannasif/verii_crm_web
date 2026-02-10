import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pdfReportTemplateApi, pdfReportTemplateQueryKeys } from '@/features/pdf-report';

export function useDeletePdfReportTemplate(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pdfReportTemplateApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfReportTemplateQueryKeys.list() });
    },
  });
}
