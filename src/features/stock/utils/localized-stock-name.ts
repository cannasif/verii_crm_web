import i18n from '@/lib/i18n';
import { stockApi } from '@/features/stock/api/stock-api';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';

export interface LocalizedStockNameSource {
  stockName: string;
  englishStockName?: string | null;
  unit?: string | null;
}

export function isTurkishUiLanguage(language?: string | null): boolean {
  const normalized = (language ?? i18n.resolvedLanguage ?? i18n.language ?? 'tr')
    .split('-')[0]
    .toLowerCase();
  return normalized === 'tr';
}

export function getLocalizedStockName(
  stock: LocalizedStockNameSource,
  language?: string | null
): string {
  const turkishName = stock.stockName?.trim() ?? '';
  const englishName = stock.englishStockName?.trim() ?? '';

  if (isTurkishUiLanguage(language)) {
    return turkishName;
  }

  return englishName || turkishName;
}

export function getLocalizedStockSearchTerms(
  stock: LocalizedStockNameSource,
  language?: string | null
): string[] {
  const terms = [stock.stockName, stock.englishStockName].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );

  if (isTurkishUiLanguage(language)) {
    return terms.length > 0 ? [terms[0]] : [];
  }

  const localized = getLocalizedStockName(stock, language);
  return localized ? [localized, ...terms.filter((term) => term !== localized)] : terms;
}

export async function resolveDocumentLineProductName(
  product: ProductSelectionResult,
  language?: string | null
): Promise<string> {
  if (product.id != null && product.id > 0) {
    try {
      const stock = await stockApi.getById(product.id);
      return getLocalizedStockName(stock, language);
    } catch {
      void 0;
    }
  }

  const code = product.code?.trim();
  if (code) {
    try {
      const stocks = await stockApi.getListByErpStockCodes([code]);
      const stock = stocks.find((item) => item.erpStockCode?.trim().toLowerCase() === code.toLowerCase());
      if (stock) {
        return getLocalizedStockName(stock, language);
      }
    } catch {
      void 0;
    }
  }

  return product.name?.trim() ?? code ?? '';
}

export function localizeLoadedLineProductName(
  line: { productCode?: string | null; productName?: string | null },
  stockByCodeLower: ReadonlyMap<string, LocalizedStockNameSource>,
  language?: string | null
): string {
  const code = line.productCode?.trim().toLowerCase() ?? '';
  if (code) {
    const stock = stockByCodeLower.get(code);
    if (stock) {
      return getLocalizedStockName(stock, language);
    }
  }

  return line.productName?.trim() ?? '';
}

export function resolveLoadedLineUnit(
  line: { productCode?: string | null; unit?: string | null },
  stockByCodeLower: ReadonlyMap<string, LocalizedStockNameSource>,
): string | null {
  const fromLine = line.unit?.trim();
  if (fromLine) {
    return fromLine;
  }

  const code = line.productCode?.trim().toLowerCase() ?? '';
  if (!code) {
    return null;
  }

  return stockByCodeLower.get(code)?.unit?.trim() ?? null;
}

export async function fetchLocalizedStockMapByErpCodes(
  productCodes: readonly string[]
): Promise<Map<string, LocalizedStockNameSource>> {
  const uniqueCodes = [
    ...new Set(
      productCodes
        .map((code) => code.trim())
        .filter((code) => code.length > 0)
    ),
  ];

  if (uniqueCodes.length === 0) {
    return new Map();
  }

  try {
    const stocks = await stockApi.getListByErpStockCodes(uniqueCodes);
    const map = new Map<string, LocalizedStockNameSource>();

    for (const stock of stocks) {
      const code = stock.erpStockCode?.trim().toLowerCase();
      if (code) {
        map.set(code, stock);
      }
    }

    return map;
  } catch {
    return new Map();
  }
}
