import { pdfReportTemplateApi, TemplateDesignerRuleType } from '@/features/pdf-report';

function resolveAssetScope(ruleType?: number): 'quick-quotation' | 'pdf-designer' {
  return ruleType === TemplateDesignerRuleType.FastQuotation ? 'quick-quotation' : 'pdf-designer';
}

export async function uploadPdfTemplateImage(
  file: File,
  templateId?: number,
  ruleType?: number,
  elementId?: string,
  pageNumber?: number
): Promise<string> {
  const asset = await pdfReportTemplateApi.uploadAsset(file, {
    templateId,
    assetScope: resolveAssetScope(ruleType),
    elementId,
    pageNumber,
  });
  return asset.relativeUrl;
}
