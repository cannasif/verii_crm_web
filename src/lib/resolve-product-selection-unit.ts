import { stockApi } from '@/features/stock/api/stock-api';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';

export async function resolveProductSelectionUnit(
  product: ProductSelectionResult,
): Promise<ProductSelectionResult> {
  if ((product.unit ?? '').trim()) {
    return product;
  }

  const stockId = product.id;
  if (stockId == null || stockId <= 0) {
    return product;
  }

  try {
    const stock = await stockApi.getById(stockId);
    const unit = stock.unit?.trim();
    if (unit) {
      return { ...product, unit };
    }
  } catch {
    return product;
  }

  return product;
}
