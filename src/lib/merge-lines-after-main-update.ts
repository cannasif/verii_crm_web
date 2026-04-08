/** Merge logic for quotation/order/demand line tables (dialog + inline quick edit). */

export interface LineMergeBase {
  id: string;
  quantity: number;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  isEditing?: boolean;
}

export function mergeLinesAfterMainLineUpdate<T extends LineMergeBase>(
  lines: T[],
  originalLine: T,
  updatedLine: T,
  relatedLinesToUpdate: T[] | undefined,
  calculateLineTotals: (line: T) => T
): T[] {
  const isQuantityChanged = originalLine.quantity !== updatedLine.quantity;
  const isMainLine = updatedLine.isMainRelatedProduct === true;

  if (relatedLinesToUpdate && relatedLinesToUpdate.length > 0) {
    const allUpdatedLines = [updatedLine, ...relatedLinesToUpdate].map((line) => ({ ...line, isEditing: false }));
    return lines.map((line) => {
      const updated = allUpdatedLines.find((ul) => ul.id === line.id);
      if (updated) return updated;
      if (
        isQuantityChanged &&
        isMainLine &&
        updatedLine.relatedProductKey &&
        line.relatedProductKey === updatedLine.relatedProductKey
      ) {
        const quantityRatio =
          originalLine.quantity !== 0 ? updatedLine.quantity / originalLine.quantity : 1;
        return calculateLineTotals({ ...line, quantity: line.quantity * quantityRatio } as T);
      }
      return line;
    });
  }

  if (isQuantityChanged && isMainLine && updatedLine.relatedProductKey) {
    const quantityRatio =
      originalLine.quantity !== 0 ? updatedLine.quantity / originalLine.quantity : 1;
    return lines.map((line) => {
      if (line.id === updatedLine.id) return { ...updatedLine, isEditing: false } as T;
      if (line.relatedProductKey === updatedLine.relatedProductKey) {
        return calculateLineTotals({ ...line, quantity: line.quantity * quantityRatio } as T);
      }
      return line;
    });
  }

  return lines.map((line) => (line.id === updatedLine.id ? { ...updatedLine, isEditing: false } as T : line));
}
