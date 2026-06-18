export type StockErpCodeDedupeInput = {
  id?: number;
  stockId?: number;
  erpStockCode?: string | null;
  isERPIntegrated?: boolean;
};

export function normalizeErpStockCodeForDedupe(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

export function resolveStockEntityId(stock: { id?: number; stockId?: number }): number {
  if (stock.stockId != null && stock.stockId > 0) {
    return stock.stockId;
  }
  if (stock.id != null && stock.id > 0) {
    return stock.id;
  }
  return 0;
}

function compareCanonicalStockPriority<T extends StockErpCodeDedupeInput>(
  left: T,
  right: T,
): number {
  const leftIntegrated = left.isERPIntegrated === true ? 0 : 1;
  const rightIntegrated = right.isERPIntegrated === true ? 0 : 1;
  if (leftIntegrated !== rightIntegrated) {
    return leftIntegrated - rightIntegrated;
  }
  return resolveStockEntityId(left) - resolveStockEntityId(right);
}

export function pickCanonicalStockByErpCode<T extends StockErpCodeDedupeInput>(
  stocks: readonly T[],
): T {
  if (stocks.length === 0) {
    throw new Error('pickCanonicalStockByErpCode requires at least one stock');
  }
  if (stocks.length === 1) {
    return stocks[0];
  }
  return [...stocks].sort(compareCanonicalStockPriority)[0];
}

export function dedupeStocksByErpStockCode<T extends StockErpCodeDedupeInput>(
  stocks: readonly T[],
): T[] {
  if (stocks.length <= 1) {
    return [...stocks];
  }

  const groupsByCode = new Map<string, T[]>();

  for (const stock of stocks) {
    const code = normalizeErpStockCodeForDedupe(stock.erpStockCode);
    if (!code) {
      continue;
    }
    const group = groupsByCode.get(code);
    if (group) {
      group.push(stock);
    } else {
      groupsByCode.set(code, [stock]);
    }
  }

  const hasDuplicateCodes = [...groupsByCode.values()].some((group) => group.length > 1);
  if (!hasDuplicateCodes) {
    return [...stocks];
  }

  const canonicalByCode = new Map<string, T>();
  for (const [code, group] of groupsByCode) {
    canonicalByCode.set(code, pickCanonicalStockByErpCode(group));
  }

  const result: T[] = [];
  const emittedCodes = new Set<string>();

  for (const stock of stocks) {
    const code = normalizeErpStockCodeForDedupe(stock.erpStockCode);
    if (!code) {
      result.push(stock);
      continue;
    }
    if (emittedCodes.has(code)) {
      continue;
    }
    emittedCodes.add(code);
    result.push(canonicalByCode.get(code)!);
  }

  return result;
}
