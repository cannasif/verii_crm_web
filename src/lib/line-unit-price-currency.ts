import type { KurDto } from '@/services/erp-types';
import type { CurrencyOption } from '@/services/hooks/useCurrencyOptions';
import {
  findMatchingPricingRuleLine,
  type PricingRuleLineMatchLike,
} from '@/lib/pricing-rule-line-match';

/** Product pricing defaults to TRY when API omits currency. */
export const DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI = 1;

export interface DocumentExchangeRate {
  dovizTipi?: number;
  exchangeRate?: number | null;
}

export function resolveDovizTipiFromCurrencyValue(
  currencyValue: string | number | null | undefined,
  currencyOptions: CurrencyOption[],
  erpRates?: KurDto[]
): number | null {
  if (currencyValue == null || currencyValue === '') {
    return null;
  }

  const raw = String(currencyValue).trim();
  const numeric = parseInt(raw, 10);
  if (!Number.isNaN(numeric) && String(numeric) === raw) {
    return numeric;
  }

  const fromOptions = currencyOptions.find(
    (opt) =>
      opt.code === raw ||
      opt.dovizIsmi === raw ||
      String(opt.dovizTipi) === raw
  );
  if (fromOptions) {
    return fromOptions.dovizTipi;
  }

  if (erpRates?.length) {
    const fromErp = erpRates.find(
      (er) => er.dovizIsmi === raw || er.dovizIsmi?.toUpperCase() === raw.toUpperCase()
    );
    if (fromErp) {
      return fromErp.dovizTipi;
    }
  }

  return null;
}

export function findExchangeRateByDovizTipiGeneric(
  dovizTipi: number,
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[]
): number | null {
  const exchangeRate = exchangeRates.find((er) => er.dovizTipi === dovizTipi);
  if (exchangeRate) {
    if (exchangeRate.exchangeRate != null && exchangeRate.exchangeRate > 0) {
      return exchangeRate.exchangeRate;
    }
    return null;
  }

  if (erpRates && erpRates.length > 0) {
    const erpRate = erpRates.find((er) => er.dovizTipi === dovizTipi);
    if (erpRate?.kurDegeri && erpRate.kurDegeri > 0) {
      return erpRate.kurDegeri;
    }
  }

  if (dovizTipi === DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI) {
    return 1;
  }

  return null;
}

export function resolveProductPricingSourceDovizTipi(params: {
  pricingRuleCurrencyCode?: string | number | null;
  apiCurrency?: string | number | null;
  hasPricingRuleFixedPrice?: boolean;
  documentDovizTipi: number;
  currencyOptions: CurrencyOption[];
  erpRates?: KurDto[];
}): number {
  const {
    pricingRuleCurrencyCode,
    apiCurrency,
    hasPricingRuleFixedPrice = false,
    documentDovizTipi,
    currencyOptions,
    erpRates,
  } = params;

  const documentResolved = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions);

  if (pricingRuleCurrencyCode != null && String(pricingRuleCurrencyCode).trim() !== '') {
    const fromRule = resolveDovizTipiFromCurrencyValue(
      pricingRuleCurrencyCode,
      currencyOptions,
      erpRates
    );
    if (fromRule != null) {
      return fromRule;
    }
  }

  if (hasPricingRuleFixedPrice) {
    return DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
  }

  const fromApi = resolveDovizTipiFromCurrencyValue(apiCurrency, currencyOptions, erpRates);
  if (fromApi != null) {
    if (
      fromApi === documentResolved &&
      documentResolved !== DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI
    ) {
      return DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
    }
    return fromApi;
  }

  return DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
}

export function convertPriceBetweenDovizTipi(
  price: number,
  sourceDovizTipi: number,
  targetDovizTipi: number,
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[]
): number | null {
  if (!Number.isFinite(price)) {
    return 0;
  }

  if (sourceDovizTipi === targetDovizTipi) {
    return price;
  }

  const sourceRate = findExchangeRateByDovizTipiGeneric(sourceDovizTipi, exchangeRates, erpRates);
  const targetRate = findExchangeRateByDovizTipiGeneric(targetDovizTipi, exchangeRates, erpRates);

  if (!sourceRate || sourceRate <= 0 || !targetRate || targetRate <= 0) {
    return null;
  }

  return (price * sourceRate) / targetRate;
}

export function getCurrencyLabelForDovizTipi(
  dovizTipi: number,
  currencyOptions: CurrencyOption[]
): string {
  const found = currencyOptions.find((opt) => opt.dovizTipi === dovizTipi);
  return found?.code || found?.dovizIsmi || String(dovizTipi);
}

export function resolveDocumentDovizTipi(
  documentCurrency: number,
  currencyOptions: CurrencyOption[]
): number {
  if (Number.isFinite(documentCurrency) && documentCurrency > 0) {
    return documentCurrency;
  }
  const tryOption = currencyOptions.find((opt) => opt.dovizTipi === DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI);
  return tryOption?.dovizTipi ?? DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
}

export function convertProductPriceToDocumentCurrency(
  listPrice: number,
  sourceCurrencyValue: string | number | null | undefined,
  documentDovizTipi: number,
  currencyOptions: CurrencyOption[],
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[],
  options?: {
    pricingRuleCurrencyCode?: string | number | null;
    hasPricingRuleFixedPrice?: boolean;
  }
): { price: number; zeroRate: boolean } {
  const resolvedDocument = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions);
  const sourceDovizTipi = resolveProductPricingSourceDovizTipi({
    pricingRuleCurrencyCode: options?.pricingRuleCurrencyCode,
    apiCurrency: sourceCurrencyValue,
    hasPricingRuleFixedPrice: options?.hasPricingRuleFixedPrice,
    documentDovizTipi,
    currencyOptions,
    erpRates,
  });

  if (sourceDovizTipi === resolvedDocument) {
    return { price: listPrice ?? 0, zeroRate: false };
  }

  const converted = convertPriceBetweenDovizTipi(
    listPrice ?? 0,
    sourceDovizTipi,
    resolvedDocument,
    exchangeRates,
    erpRates
  );

  if (converted == null) {
    return { price: listPrice ?? 0, zeroRate: true };
  }

  return { price: converted, zeroRate: false };
}

export function convertPriceForDocumentCurrency(
  listPrice: number,
  sourceCurrencyValue: string | number | null | undefined,
  documentDovizTipi: number,
  currencyOptions: CurrencyOption[],
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[],
  options?: {
    pricingRuleCurrencyCode?: string | number | null;
    hasPricingRuleFixedPrice?: boolean;
  }
): number {
  return convertProductPriceToDocumentCurrency(
    listPrice,
    sourceCurrencyValue,
    documentDovizTipi,
    currencyOptions,
    exchangeRates,
    erpRates,
    options
  ).price;
}

export interface PricingRulePriceLineLike extends PricingRuleLineMatchLike {
  fixedUnitPrice?: number | null;
  currencyCode?: string;
  discountRate1?: number;
  discountRate2?: number;
  discountRate3?: number;
  pricingRuleHeaderId?: number;
}

export interface PriceOfProductLike {
  listPrice?: number | null;
  currency?: string | null;
  discount1?: number | null;
  discount2?: number | null;
  discount3?: number | null;
}

export interface ConvertedProductLinePrice {
  unitPrice: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  pricingRuleHeaderId: number | null;
  zeroRate: boolean;
}

export function convertProductLinePriceForDocument(params: {
  priceData: PriceOfProductLike;
  productCode: string;
  quantity: number;
  documentDovizTipi: number;
  currencyOptions: CurrencyOption[];
  exchangeRates: DocumentExchangeRate[];
  erpRates?: KurDto[];
  pricingRules?: PricingRulePriceLineLike[];
}): ConvertedProductLinePrice {
  const {
    priceData,
    productCode,
    quantity,
    documentDovizTipi,
    currencyOptions,
    exchangeRates,
    erpRates,
    pricingRules = [],
  } = params;

  const matchingRule = findMatchingPricingRuleLine(pricingRules, productCode, quantity);
  const hasPricingRuleFixedPrice =
    matchingRule?.fixedUnitPrice != null && matchingRule?.fixedUnitPrice !== undefined;
  const rawListPrice = hasPricingRuleFixedPrice
    ? matchingRule!.fixedUnitPrice!
    : (priceData.listPrice ?? 0);

  const { price, zeroRate } = convertProductPriceToDocumentCurrency(
    rawListPrice ?? 0,
    priceData.currency,
    documentDovizTipi,
    currencyOptions,
    exchangeRates,
    erpRates,
    {
      pricingRuleCurrencyCode: matchingRule?.currencyCode,
      hasPricingRuleFixedPrice,
    }
  );

  return {
    unitPrice: price,
    discountRate1: matchingRule?.discountRate1 ?? priceData.discount1 ?? 0,
    discountRate2: matchingRule?.discountRate2 ?? priceData.discount2 ?? 0,
    discountRate3: matchingRule?.discountRate3 ?? priceData.discount3 ?? 0,
    pricingRuleHeaderId: matchingRule?.pricingRuleHeaderId ?? null,
    zeroRate,
  };
}
