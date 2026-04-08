import type { CurrencyOption } from '@/services/hooks/useCurrencyOptions';
import type { KurDto } from '@/services/erp-types';
import type {
  DemandLineFormState,
  DemandExchangeRateFormState,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  ApprovalStatus,
} from '../types/demand-types';
import { findExchangeRateByDovizTipi } from './price-conversion';

export type DemandQuickEditField =
  | 'quantity'
  | 'unitPrice'
  | 'discountRate1'
  | 'discountRate2'
  | 'discountRate3';

function normalizeGroupCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

function toGroupRoot(code?: string | null): string {
  const normalized = normalizeGroupCode(code);
  return normalized.split('/')[0] ?? normalized;
}

function groupMatches(limitCode?: string | null, stockCode?: string | null): boolean {
  const limitNormalized = normalizeGroupCode(limitCode);
  const stockNormalized = normalizeGroupCode(stockCode);
  if (!limitNormalized || !stockNormalized) return false;
  if (limitNormalized === stockNormalized) return true;
  return toGroupRoot(limitNormalized) === toGroupRoot(stockNormalized);
}

function convertPriceWithCurrency(
  price: number,
  sourceCurrencyCode: string,
  targetCurrency: number,
  currencyOptions: CurrencyOption[],
  exchangeRates: DemandExchangeRateFormState[],
  erpRates: KurDto[]
): number {
  if (!sourceCurrencyCode) return price;

  const sourceCurrencyOption = currencyOptions.find(
    (opt) => opt.code === sourceCurrencyCode || opt.dovizIsmi === sourceCurrencyCode
  );
  const sourceDovizTipi = sourceCurrencyOption?.dovizTipi;

  if (!sourceDovizTipi) return price;
  if (sourceDovizTipi === targetCurrency) return price;

  const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
  const targetRate = findExchangeRateByDovizTipi(targetCurrency, exchangeRates, erpRates);

  if (!sourceRate || sourceRate <= 0 || !targetRate || targetRate <= 0) return price;

  const priceInTL = price * sourceRate;
  return priceInTL / targetRate;
}

function applyDiscountApproval(
  line: DemandLineFormState,
  userDiscountLimits: UserDiscountLimitDto[]
): DemandLineFormState {
  const activeGroupCode = line.groupCode ?? line.productCode ?? null;
  if (!activeGroupCode || userDiscountLimits.length === 0) {
    return { ...line, approvalStatus: 0 as ApprovalStatus };
  }

  const matchingLimit = userDiscountLimits.find((limit) =>
    groupMatches(limit.erpProductGroupCode, activeGroupCode)
  );

  if (!matchingLimit) {
    return { ...line, approvalStatus: 0 as ApprovalStatus };
  }

  const exceedsLimit1 = line.discountRate1 > matchingLimit.maxDiscount1;
  const exceedsLimit2 =
    matchingLimit.maxDiscount2 !== null && matchingLimit.maxDiscount2 !== undefined
      ? line.discountRate2 > matchingLimit.maxDiscount2
      : false;
  const exceedsLimit3 =
    matchingLimit.maxDiscount3 !== null && matchingLimit.maxDiscount3 !== undefined
      ? line.discountRate3 > matchingLimit.maxDiscount3
      : false;

  const exceedsLimit = exceedsLimit1 || exceedsLimit2 || exceedsLimit3;
  return {
    ...line,
    approvalStatus: (exceedsLimit ? 1 : 0) as ApprovalStatus,
  };
}

export interface ApplyDemandLineQuickFieldPatchDeps {
  currency: number;
  currencyOptions: CurrencyOption[];
  exchangeRates: DemandExchangeRateFormState[];
  erpRates: KurDto[];
  pricingRules: PricingRuleLineGetDto[];
  userDiscountLimits: UserDiscountLimitDto[];
  calculateLineTotals: (line: DemandLineFormState) => DemandLineFormState;
}

export function applyDemandLineQuickFieldPatch(
  line: DemandLineFormState,
  field: DemandQuickEditField,
  value: number,
  deps: ApplyDemandLineQuickFieldPatchDeps
): DemandLineFormState {
  const { currency, currencyOptions, exchangeRates, erpRates, pricingRules, userDiscountLimits, calculateLineTotals } =
    deps;

  let next: DemandLineFormState = { ...line, [field]: value };

  if (field === 'quantity' && line.productCode) {
    const newQuantity = value;
    const matchingPricingRule = pricingRules
      .filter((rule) => normalizeGroupCode(rule.stokCode) === normalizeGroupCode(line.productCode))
      .filter((rule) => {
        const minQuantity = rule.minQuantity ?? 0;
        const maxQuantity = rule.maxQuantity ?? Infinity;
        return newQuantity >= minQuantity && newQuantity <= maxQuantity;
      })
      .sort((left, right) => (right.minQuantity ?? 0) - (left.minQuantity ?? 0))[0];

    if (matchingPricingRule) {
      if (matchingPricingRule.fixedUnitPrice !== null && matchingPricingRule.fixedUnitPrice !== undefined) {
        const convertedPrice = convertPriceWithCurrency(
          matchingPricingRule.fixedUnitPrice,
          matchingPricingRule.currencyCode ?? '',
          currency,
          currencyOptions,
          exchangeRates,
          erpRates
        );
        next = {
          ...next,
          unitPrice: convertedPrice,
          discountRate1: matchingPricingRule.discountRate1,
          discountRate2: matchingPricingRule.discountRate2,
          discountRate3: matchingPricingRule.discountRate3,
          pricingRuleHeaderId: matchingPricingRule.pricingRuleHeaderId,
        };
      } else {
        next = {
          ...next,
          discountRate1: matchingPricingRule.discountRate1,
          discountRate2: matchingPricingRule.discountRate2,
          discountRate3: matchingPricingRule.discountRate3,
          pricingRuleHeaderId: matchingPricingRule.pricingRuleHeaderId,
        };
      }
    }
  }

  next = calculateLineTotals(next);
  next = applyDiscountApproval(next, userDiscountLimits);

  return next;
}
