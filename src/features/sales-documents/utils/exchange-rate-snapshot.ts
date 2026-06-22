import type { KurDto } from '@/services/erp-types';

export interface SalesExchangeRateLike {
  id?: string | number;
  currency?: string | null;
  exchangeRate?: number | null;
  exchangeRateDate?: string | null;
  isOfficial?: boolean | null;
  dovizTipi?: number | null;
}

const normalizeCurrencyToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');

const getCurrencyTokens = (value: unknown): string[] => {
  const normalized = normalizeCurrencyToken(value);
  if (!normalized) return [];

  const tokens = normalized.split(/[^A-Z0-9]+/).filter(Boolean);
  const compact = normalized.replace(/[^A-Z0-9]/g, '');
  return Array.from(new Set([...tokens, compact, normalized].filter(Boolean)));
};

const getCurrencyAlias = (token: string): string | null => {
  switch (token) {
    case 'USD':
    case 'DOLAR':
    case 'DOLLAR':
      return 'USD';
    case 'EUR':
    case 'EURO':
    case 'AVRO':
      return 'EUR';
    case 'GBP':
    case 'STERLIN':
    case 'POUND':
      return 'GBP';
    case 'TL':
    case 'TRY':
    case 'TRL':
    case 'TURK':
    case 'LIRASI':
    case 'TURKLIRASI':
      return 'TRY';
    default:
      return null;
  }
};

const currencyMatches = (left: unknown, right: unknown): boolean => {
  const leftTokens = getCurrencyTokens(left);
  const rightTokens = getCurrencyTokens(right);

  return leftTokens.some((leftToken) =>
    rightTokens.some((rightToken) => {
      if (leftToken === rightToken) return true;

      const leftAlias = getCurrencyAlias(leftToken);
      const rightAlias = getCurrencyAlias(rightToken);
      return !!leftAlias && leftAlias === rightAlias;
    }),
  );
};

const isLocalCurrency = (value: unknown): boolean =>
  getCurrencyTokens(value).some((token) =>
    ['0', 'TL', 'TRY', 'TRL', 'TURK', 'LIRASI', 'TURKLIRASI'].includes(token),
  );

const resolveSelectedErpRate = (erpRates: KurDto[], selectedCurrency: unknown): KurDto | null => {
  const selectedToken = normalizeCurrencyToken(selectedCurrency);
  if (!selectedToken || isLocalCurrency(selectedToken)) return null;

  const numericCurrency = Number(selectedToken);
  if (Number.isFinite(numericCurrency)) {
    return erpRates.find((rate) => rate.dovizTipi === numericCurrency) ?? null;
  }

  return erpRates.find((rate) => currencyMatches(rate.dovizIsmi, selectedToken)) ?? null;
};

const todayDateOnly = (): string => new Date().toISOString().split('T')[0];

export const buildEffectiveExchangeRates = <T extends SalesExchangeRateLike>(
  exchangeRates: T[],
  erpRates: KurDto[],
  selectedCurrency: string | number | null | undefined,
  documentDate?: string | null,
): T[] => {
  const currentRates = [...exchangeRates];
  const selectedErpRate = resolveSelectedErpRate(erpRates, selectedCurrency);

  if (!selectedErpRate || selectedErpRate.dovizTipi === 0) {
    return currentRates;
  }

  const selectedToken = normalizeCurrencyToken(selectedCurrency);
  const hasSelectedSnapshot = currentRates.some((rate) => {
    const isSameCurrency =
      rate.dovizTipi === selectedErpRate.dovizTipi ||
      currencyMatches(rate.currency, String(selectedErpRate.dovizTipi)) ||
      currencyMatches(rate.currency, selectedToken) ||
      currencyMatches(rate.currency, selectedErpRate.dovizIsmi);

    return isSameCurrency && Number(rate.exchangeRate ?? 0) > 0;
  });

  if (hasSelectedSnapshot || selectedErpRate.kurDegeri == null || selectedErpRate.kurDegeri <= 0) {
    return currentRates;
  }

  return [
    ...currentRates,
    {
      id: `erp-${selectedErpRate.dovizTipi}`,
      currency: String(selectedErpRate.dovizTipi),
      exchangeRate: selectedErpRate.kurDegeri,
      exchangeRateDate: documentDate || todayDateOnly(),
      isOfficial: true,
      dovizTipi: selectedErpRate.dovizTipi,
    } as T,
  ];
};
