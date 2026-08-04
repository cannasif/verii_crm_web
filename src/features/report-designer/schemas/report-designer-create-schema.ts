import { z } from 'zod';
import i18n from '@/lib/i18n';
import { TemplateDesignerRuleType } from '../types/report-template-types';

export const reportDesignerCreateSchema = z.object({
  ruleType: z.union(
    [
      z.literal(TemplateDesignerRuleType.Demand),
      z.literal(TemplateDesignerRuleType.Quotation),
      z.literal(TemplateDesignerRuleType.Order),
      z.literal(TemplateDesignerRuleType.FastQuotation),
      z.literal(TemplateDesignerRuleType.Activity),
    ],
    { error: i18n.t('reportDesigner.form.requiredDocumentType') }
  ),
  title: z.string().min(1, i18n.t('reportDesigner.form.requiredTitle')),
  default: z.boolean(),
});

export type ReportDesignerCreateFormValues = z.infer<typeof reportDesignerCreateSchema>;
