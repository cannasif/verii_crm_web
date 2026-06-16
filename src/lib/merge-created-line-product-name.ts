export function mergeCreatedLineProductName<T extends { productName?: string | null }>(
  mappedLine: T,
  sourceLine?: { productName?: string | null } | null
): T {
  const sourceName = sourceLine?.productName?.trim();
  if (!sourceName) {
    return mappedLine;
  }

  return {
    ...mappedLine,
    productName: sourceName,
  };
}
