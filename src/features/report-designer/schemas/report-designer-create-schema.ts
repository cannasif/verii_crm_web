import { z } from 'zod';
import i18n from '@/lib/i18n';
import { TemplateDesignerRuleType } from '../types/report-template-types';

export const reportDesignerCreateSchema = z.object({
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
});

export type ReportDesignerCreateFormValues = z.infer<typeof reportDesignerCreateSchema>;
