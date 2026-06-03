import type { KurDto } from '@/services/erp-types';
import type { CurrencyOption } from '@/services/hooks/useCurrencyOptions';

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

  return null;
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
  erpRates?: KurDto[]
): { price: number; zeroRate: boolean } {
  const resolvedDocument = resolveDocumentDovizTipi(documentDovizTipi, currencyOptions);
  let sourceDovizTipi = resolveDovizTipiFromCurrencyValue(
    sourceCurrencyValue,
    currencyOptions,
    erpRates
  );

  if (sourceDovizTipi == null) {
    sourceDovizTipi = DEFAULT_PRICING_CURRENCY_DOVIZ_TIPI;
  }

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
