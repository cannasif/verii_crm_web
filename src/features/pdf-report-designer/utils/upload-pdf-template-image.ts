import { pdfReportTemplateApi, TemplateDesignerRuleType } from '@/features/pdf-report';

function resolveAssetScope(ruleType?: number): 'quick-quotation' | 'pdf-designer' {
  return ruleType === TemplateDesignerRuleType.FastQuotation ? 'quick-quotation' : 'pdf-designer';
}

export async function uploadPdfTemplateImage(
  file: File,
  templateId?: number,
  ruleType?: number
): Promise<string> {
  const asset = await pdfReportTemplateApi.uploadAsset(file, templateId, resolveAssetScope(ruleType));
  return asset.relativeUrl;
}
