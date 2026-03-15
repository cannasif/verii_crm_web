import type { OrderExchangeRateFormState } from '../types/order-types';
import type { KurDto } from '@/services/erp-types';

function findDovizTipiFromCurrencyCode(currencyCode: string, erpRates: KurDto[]): number | null {
  const erpRate = erpRates.find((er) => {
    return er.dovizIsmi === currencyCode || er.dovizIsmi?.toUpperCase() === currencyCode.toUpperCase();
  });
  return erpRate?.dovizTipi ?? null;
}

export function findExchangeRateByDovizTipi(
  dovizTipi: number,
  exchangeRates: OrderExchangeRateFormState[],
  erpRates?: KurDto[]
): number | null {
  const exchangeRate = exchangeRates.find((er) => er.dovizTipi === dovizTipi);
  if (exchangeRate?.exchangeRate && exchangeRate.exchangeRate > 0) {
    return exchangeRate.exchangeRate;
  }

  if (erpRates && erpRates.length > 0) {
    const erpRate = erpRates.find((er) => er.dovizTipi === dovizTipi);
    if (erpRate?.kurDegeri && erpRate.kurDegeri > 0) {
      return erpRate.kurDegeri;
    }
  }

  return null;
}

export function convertPriceToTargetCurrency(
  price: number,
  sourceCurrency: string,
  targetCurrency: string,
  exchangeRates: OrderExchangeRateFormState[],
  erpRates?: KurDto[]
): number {
  if (!erpRates || erpRates.length === 0) {
    return price;
  }

  const sourceDovizTipi = findDovizTipiFromCurrencyCode(sourceCurrency, erpRates);
  const targetDovizTipi = findDovizTipiFromCurrencyCode(targetCurrency, erpRates);

  if (sourceDovizTipi == null || targetDovizTipi == null) {
    return price;
  }

  if (sourceDovizTipi === targetDovizTipi) {
    return price;
  }

  const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
  const targetRate = findExchangeRateByDovizTipi(targetDovizTipi, exchangeRates, erpRates);

  if (!sourceRate || sourceRate <= 0) {
    return price;
  }

  if (!targetRate || targetRate <= 0) {
    return price;
  }

  const priceInTL = price * sourceRate;
  const finalPrice = priceInTL / targetRate;

  return finalPrice;
}
