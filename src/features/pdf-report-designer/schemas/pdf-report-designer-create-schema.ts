import { z } from 'zod';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import i18n from '@/lib/i18n';

export const pdfReportDesignerCreateSchema = z.object({
  ruleType: z.nativeEnum(PricingRuleType, {
    message: i18n.t('reportDesigner.form.requiredDocumentType'),
  }),
  title: z.string().min(1, i18n.t('reportDesigner.form.requiredTitle')),
  default: z.boolean(),
});

export type PdfReportDesignerCreateFormValues = z.infer<typeof pdfReportDesignerCreateSchema>;
