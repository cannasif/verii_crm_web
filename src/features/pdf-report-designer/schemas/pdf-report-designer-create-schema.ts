import { z } from 'zod';
import i18n from '@/lib/i18n';
import { PDF_LAYOUT_PRESET } from '../constants/layout-presets';
import { TemplateDesignerRuleType } from '@/features/pdf-report';

export const pdfReportDesignerCreateSchema = z.object({
  ruleType: z
    .number()
    .refine(
      (value) =>
        value === TemplateDesignerRuleType.Demand ||
        value === TemplateDesignerRuleType.Quotation ||
        value === TemplateDesignerRuleType.Order ||
        value === TemplateDesignerRuleType.FastQuotation,
      { message: i18n.t('reportDesigner.form.requiredDocumentType') }
    ),
  title: z.string().min(1, i18n.t('reportDesigner.form.requiredTitle')),
  default: z.boolean(),
  pageCount: z.number().int().min(1).max(20),
  layoutPreset: z.enum([PDF_LAYOUT_PRESET.Custom]),
});

export type PdfReportDesignerCreateFormValues = z.infer<typeof pdfReportDesignerCreateSchema>;
