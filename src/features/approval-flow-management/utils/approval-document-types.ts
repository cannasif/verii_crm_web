import type { TFunction } from 'i18next';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

export const APPROVAL_DOCUMENT_TYPES = [
  PricingRuleType.Demand,
  PricingRuleType.Quotation,
  PricingRuleType.Order,
] as const;

export function getApprovalDocumentTypeLabel(t: TFunction, type: number): string {
  switch (type) {
    case PricingRuleType.Demand:
      return t('approvalFlow.documentType.demand');
    case PricingRuleType.Quotation:
      return t('approvalFlow.documentType.quotation');
    case PricingRuleType.Order:
      return t('approvalFlow.documentType.order');
    default:
      return '-';
  }
}
