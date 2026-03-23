import { pdfReportTemplateApi } from '@/features/pdf-report';

export async function uploadPdfTemplateImage(file: File, templateId?: number): Promise<string> {
  const asset = await pdfReportTemplateApi.uploadAsset(file, templateId);
  return asset.relativeUrl;
}
