export function mergeCreatedLineProductName<T extends { productName?: string | null; unit?: string | null }>(
  mappedLine: T,
  sourceLine?: { productName?: string | null; unit?: string | null } | null,
): T {
  const sourceName = sourceLine?.productName?.trim();
  const mappedUnit = mappedLine.unit?.trim();
  const sourceUnit = sourceLine?.unit?.trim();

  return {
    ...mappedLine,
    ...(sourceName ? { productName: sourceName } : {}),
    unit: (mappedUnit || sourceUnit || mappedLine.unit) ?? null,
  };
}
