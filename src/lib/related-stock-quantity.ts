import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';

export function getRelatedQuantityPerMainUnit(
  product: ProductSelectionResult,
  relatedStockId: number
): number {
  const raw = product.relatedStockQuantitiesById?.[relatedStockId];
  if (raw != null && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return 1;
}
