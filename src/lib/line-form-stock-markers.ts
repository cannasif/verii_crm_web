import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';

/** Satır formu / tablo satırı — stok seçicide “satırda” eşlemesi için. */
export type LineStockMarkerSource = {
  id: string | number;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  unit?: string | null;
  groupCode?: string | null;
  relatedLines?: LineStockMarkerSource[];
};

function pushLineMarker(out: ProductSelectionResult[], row: LineStockMarkerSource): void {
  const code = (row.productCode ?? '').trim();
  if (!code) return;
  const pid = row.productId;
  out.push({
    ...(pid != null && pid > 0 ? { id: pid } : {}),
    code,
    name: (row.productName ?? '').trim() || code,
    unit: row.unit ?? undefined,
    groupCode: row.groupCode ?? undefined,
  });
}

function visitLineTree(row: LineStockMarkerSource, out: ProductSelectionResult[]): void {
  pushLineMarker(out, row);
  for (const r of row.relatedLines ?? []) visitLineTree(r, out);
}

/** Belgedeki tüm satırlar (ana + bağlı) için stok eşleştirme listesi. */
export function linesToDocumentStockMarkers(lines: LineStockMarkerSource[]): ProductSelectionResult[] {
  const out: ProductSelectionResult[] = [];
  for (const l of lines) visitLineTree(l, out);
  return out;
}

/** Düzenlenen satır hariç — aynı satırdaki ürünü “satırda” diye işaretlememek için. */
export function linesToDocumentStockMarkersExceptLine(
  lines: LineStockMarkerSource[],
  excludeLineId: string | number | null | undefined
): ProductSelectionResult[] {
  if (excludeLineId == null || excludeLineId === '') {
    return linesToDocumentStockMarkers(lines);
  }
  const ex = String(excludeLineId);
  const filtered = lines.filter((l) => String(l.id) !== ex);
  return linesToDocumentStockMarkers(filtered);
}
