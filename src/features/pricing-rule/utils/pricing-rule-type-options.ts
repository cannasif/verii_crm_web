import {
  ClipboardList,
  FileQuestion,
  FileText,
  List,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PricingRuleType } from '../types/pricing-rule-types';

export const PRICING_RULE_TYPE_OPTIONS = [
  { value: PricingRuleType.Demand, labelKey: 'pricingRule.ruleType.demand' },
  { value: PricingRuleType.Quotation, labelKey: 'pricingRule.ruleType.quotation' },
  { value: PricingRuleType.Order, labelKey: 'pricingRule.ruleType.order' },
  { value: PricingRuleType.PurchaseRequest, labelKey: 'pricingRule.ruleType.purchaseRequest' },
  { value: PricingRuleType.PurchaseRfq, labelKey: 'pricingRule.ruleType.purchaseRfq' },
  { value: PricingRuleType.SupplierQuotation, labelKey: 'pricingRule.ruleType.supplierQuotation' },
  { value: PricingRuleType.PurchaseOrder, labelKey: 'pricingRule.ruleType.purchaseOrder' },
] as const;

export function isSupportedPricingRuleType(value: unknown): value is PricingRuleType {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  return typeof numericValue === 'number' && PRICING_RULE_TYPE_OPTIONS.some((option) => option.value === numericValue);
}

export function normalizePricingRuleTypeValue(value: PricingRuleType | string | number | null | undefined): PricingRuleType | null {
  if (value == null) return null;
  if (typeof value === 'number') return isSupportedPricingRuleType(value) ? value : null;

  const trimmed = value.trim();
  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) return normalizePricingRuleTypeValue(numericValue);

  const normalized = trimmed.toLowerCase();
  if (normalized === 'demand') return PricingRuleType.Demand;
  if (normalized === 'quotation') return PricingRuleType.Quotation;
  if (normalized === 'order') return PricingRuleType.Order;
  if (normalized === 'purchaserequest') return PricingRuleType.PurchaseRequest;
  if (normalized === 'purchaserfq') return PricingRuleType.PurchaseRfq;
  if (normalized === 'supplierquotation') return PricingRuleType.SupplierQuotation;
  if (normalized === 'purchaseorder') return PricingRuleType.PurchaseOrder;

  return null;
}

export function getPricingRuleTypeLabelKey(type: PricingRuleType | number | string | null | undefined): string {
  const normalized = normalizePricingRuleTypeValue(type);
  return PRICING_RULE_TYPE_OPTIONS.find((option) => option.value === normalized)?.labelKey ?? 'pricingRule.ruleType.unknown';
}

export function getPricingRuleTypeIcon(type: PricingRuleType | number | string | null | undefined): LucideIcon {
  const normalized = normalizePricingRuleTypeValue(type);
  switch (normalized) {
    case PricingRuleType.Demand:
      return List;
    case PricingRuleType.Quotation:
      return FileText;
    case PricingRuleType.Order:
      return ShoppingCart;
    case PricingRuleType.PurchaseRequest:
      return ClipboardList;
    case PricingRuleType.PurchaseRfq:
      return FileQuestion;
    case PricingRuleType.SupplierQuotation:
      return ShoppingBag;
    case PricingRuleType.PurchaseOrder:
      return Package;
    default:
      return TrendingUp;
  }
}
