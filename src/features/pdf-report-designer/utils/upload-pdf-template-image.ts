import { pdfReportTemplateApi } from '@/features/pdf-report';

export async function uploadPdfTemplateImage(file: File): Promise<string> {
  const asset = await pdfReportTemplateApi.uploadAsset(file);
  return asset.relativeUrl;
}
