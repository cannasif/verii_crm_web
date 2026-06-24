import type { KurDto } from '@/services/erp-types';
import type { CurrencyOption } from '@/services/hooks/useCurrencyOptions';
import {
  findMatchingPricingRuleLine,
  type PricingRuleLineMatchLike,
} from '@/lib/pricing-rule-line-match';

/** Legacy fallback when local currency cannot be resolved from ERP options. */
export const DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI = 1;

const LOCAL_CURRENCY_LABELS = ['TL', 'TRY', 'TÜRK LİRASI', 'TURK LIRASI'];

function isLocalCurrencyLabel(name: string | null | undefined): boolean {
  if (!name) {
    return false;
  }
  const upper = name.trim().toUpperCase();
  return LOCAL_CURRENCY_LABELS.some(
    (label) => upper === label || upper.includes('LIRA') || upper.includes('LİRA')
  );
}

export function parseWatchedDocumentCurrency(
  raw: string | number | null | undefined
): number {
  if (raw === '' || raw === null || raw === undefined) {
    return Number.NaN;
  }
  const parsed = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function resolveWatchedDocumentCurrency(
  raw: string | number | null | undefined,
  currencyOptions: CurrencyOption[],
  erpRates?: KurDto[]
): number {
  const parsed = parseWatchedDocumentCurrency(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return resolveDocumentDovizTipi(Number.NaN, currencyOptions, erpRates);
}

/** Resolves TL/TRY dovizTipi from ERP options (often 0, sometimes 1). */
export function resolveLocalCurrencyDovizTipi(
  currencyOptions: CurrencyOption[],
  erpRates?: KurDto[]
): number {
  const fromOptions = currencyOptions.find(
    (opt) => isLocalCurrencyLabel(opt.dovizIsmi) || isLocalCurrencyLabel(opt.code)
  );
  if (fromOptions) {
    return fromOptions.dovizTipi;
  }

  const fromErp = erpRates?.find((rate) => isLocalCurrencyLabel(rate.dovizIsmi));
  if (fromErp != null) {
    return fromErp.dovizTipi;
  }

  const zeroOption = currencyOptions.find((opt) => opt.dovizTipi === 0);
  if (zeroOption) {
    return 0;
  }

  const legacyTryOption = currencyOptions.find(
    (opt) => opt.dovizTipi === DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI
  );
  if (legacyTryOption) {
    return legacyTryOption.dovizTipi;
  }

  return currencyOptions[0]?.dovizTipi ?? DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
}

function isLocalCurrencyDovizTipi(
  dovizTipi: number,
  currencyOptions: CurrencyOption[],
  erpRates?: KurDto[]
): boolean {
  if (dovizTipi === resolveLocalCurrencyDovizTipi(currencyOptions, erpRates)) {
    return true;
  }
  if (dovizTipi === 0) {
    return true;
  }
  const option = currencyOptions.find((opt) => opt.dovizTipi === dovizTipi);
  return isLocalCurrencyLabel(option?.dovizIsmi ?? option?.code);
}

export interface DocumentExchangeRate {
  dovizTipi?: number;
  exchangeRate?: number | null;
}

interface ExchangeRateLookupOptions {
  allowErpFallback?: boolean;
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
  erpRates?: KurDto[],
  currencyOptions: CurrencyOption[] = [],
  options: ExchangeRateLookupOptions = {}
): number | null {
  if (isLocalCurrencyDovizTipi(dovizTipi, currencyOptions, erpRates)) {
    return 1;
  }

  const exchangeRate = exchangeRates.find((er) => er.dovizTipi === dovizTipi);
  if (exchangeRate) {
    if (exchangeRate.exchangeRate != null && exchangeRate.exchangeRate > 0) {
      return exchangeRate.exchangeRate;
    }
    return null;
  }

  const allowErpFallback = options.allowErpFallback ?? true;
  if (allowErpFallback && erpRates && erpRates.length > 0) {
    const erpRate = erpRates.find((er) => er.dovizTipi === dovizTipi);
    if (erpRate?.kurDegeri && erpRate.kurDegeri > 0) {
      return erpRate.kurDegeri;
    }
  }

  return null;
}

export function hasRequiredDocumentExchangeRate(
  documentDovizTipi: number,
  currencyOptions: CurrencyOption[],
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[],
  options: ExchangeRateLookupOptions = {}
): boolean {
  const resolvedDocument = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions, erpRates);
  if (isLocalCurrencyDovizTipi(resolvedDocument, currencyOptions, erpRates)) {
    return true;
  }

  const rate = findExchangeRateByDovizTipiGeneric(
    resolvedDocument,
    exchangeRates,
    erpRates,
    currencyOptions,
    options
  );

  return rate != null && rate > 0;
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

  const documentResolved = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions, erpRates);
  const localCurrency = resolveLocalCurrencyDovizTipi(currencyOptions, erpRates);

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
    return localCurrency;
  }

  const fromApi = resolveDovizTipiFromCurrencyValue(apiCurrency, currencyOptions, erpRates);
  if (fromApi != null) {
    if (fromApi === documentResolved && documentResolved !== localCurrency) {
      return localCurrency;
    }
    return fromApi;
  }

  return localCurrency;
}

export function convertPriceBetweenDovizTipi(
  price: number,
  sourceDovizTipi: number,
  targetDovizTipi: number,
  exchangeRates: DocumentExchangeRate[],
  erpRates?: KurDto[],
  currencyOptions: CurrencyOption[] = [],
  options: ExchangeRateLookupOptions = {}
): number | null {
  if (!Number.isFinite(price)) {
    return 0;
  }

  if (sourceDovizTipi === targetDovizTipi) {
    return price;
  }

  const sourceRate = findExchangeRateByDovizTipiGeneric(
    sourceDovizTipi,
    exchangeRates,
    erpRates,
    currencyOptions,
    options
  );
  const targetRate = findExchangeRateByDovizTipiGeneric(
    targetDovizTipi,
    exchangeRates,
    erpRates,
    currencyOptions,
    options
  );

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
  currencyOptions: CurrencyOption[],
  erpRates?: KurDto[]
): number {
  if (Number.isFinite(documentCurrency) && documentCurrency >= 0) {
    if (currencyOptions.length === 0) {
      return documentCurrency;
    }
    const match = currencyOptions.find((opt) => opt.dovizTipi === documentCurrency);
    if (match) {
      return documentCurrency;
    }
  }
  return resolveLocalCurrencyDovizTipi(currencyOptions, erpRates);
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
    requireDocumentExchangeRates?: boolean;
  }
): { price: number; zeroRate: boolean } {
  const resolvedDocument = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions, erpRates);
  if (
    options?.requireDocumentExchangeRates &&
    !hasRequiredDocumentExchangeRate(documentDovizTipi, currencyOptions, exchangeRates, erpRates, {
      allowErpFallback: false,
    })
  ) {
    return { price: listPrice ?? 0, zeroRate: true };
  }

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
    erpRates,
    currencyOptions,
    {
      allowErpFallback: !options?.requireDocumentExchangeRates,
    }
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
  requireDocumentExchangeRates?: boolean;
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
    requireDocumentExchangeRates = false,
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
      requireDocumentExchangeRates,
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
