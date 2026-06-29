import { resolveDocumentLineBackendId, type DocumentLineBackendRef } from './document-line-list-update';

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

export type CreatedDocumentLineBackendRef = {
  id?: number | null;
  Id?: number | null;
  productCode?: string | null;
  ProductCode?: string | null;
};

function resolveCreatedDocumentLineBackendId(line: CreatedDocumentLineBackendRef | undefined): number | null {
  const rawId = line?.id ?? line?.Id;
  if (rawId == null || !Number.isFinite(rawId) || rawId <= 0) {
    return null;
  }
  return rawId;
}

function normalizeProductCode(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleUpperCase('tr-TR');
}

function resolveCreatedDocumentLineProductCode(line: CreatedDocumentLineBackendRef | undefined): string {
  return normalizeProductCode(line?.productCode ?? line?.ProductCode);
}

function resolveSourceLineForCreatedLine(
  createdLine: CreatedDocumentLineBackendRef,
  index: number,
  sourceLines: Array<{ productCode?: string | null; productName?: string | null; unit?: string | null }>,
  usedSourceIndexes: Set<number>,
): { productCode?: string | null; productName?: string | null; unit?: string | null } | undefined {
  const indexedSourceLine = sourceLines[index];
  const createdProductCode = resolveCreatedDocumentLineProductCode(createdLine);
  const indexedProductCode = normalizeProductCode(indexedSourceLine?.productCode);

  if (
    indexedSourceLine &&
    !usedSourceIndexes.has(index) &&
    (!createdProductCode || !indexedProductCode || createdProductCode === indexedProductCode)
  ) {
    usedSourceIndexes.add(index);
    return indexedSourceLine;
  }

  if (!createdProductCode) {
    return undefined;
  }

  const matchedIndex = sourceLines.findIndex(
    (sourceLine, sourceIndex) =>
      !usedSourceIndexes.has(sourceIndex) &&
      normalizeProductCode(sourceLine.productCode) === createdProductCode,
  );

  if (matchedIndex < 0) {
    return undefined;
  }

  usedSourceIndexes.add(matchedIndex);
  return sourceLines[matchedIndex];
}

export function mergeCreatedLineProductNamesByBackendId<
  TMappedLine extends DocumentLineBackendRef & { productName?: string | null; unit?: string | null },
  TCreatedLine extends CreatedDocumentLineBackendRef,
>(
  mappedLines: TMappedLine[],
  createdLines: TCreatedLine[],
  sourceLines: Array<{ productCode?: string | null; productName?: string | null; unit?: string | null }>,
): TMappedLine[] {
  const sourceByCreatedBackendId = new Map<number, { productCode?: string | null; productName?: string | null; unit?: string | null }>();
  const usedSourceIndexes = new Set<number>();

  createdLines.forEach((createdLine, index) => {
    const backendId = resolveCreatedDocumentLineBackendId(createdLine);
    const sourceLine = resolveSourceLineForCreatedLine(createdLine, index, sourceLines, usedSourceIndexes);
    if (backendId != null && sourceLine) {
      sourceByCreatedBackendId.set(backendId, sourceLine);
    }
  });

  if (sourceByCreatedBackendId.size === 0) {
    return mappedLines;
  }

  return mappedLines.map((mappedLine) => {
    const backendId = resolveDocumentLineBackendId(mappedLine);
    const sourceLine = backendId != null ? sourceByCreatedBackendId.get(backendId) : undefined;
    return sourceLine ? mergeCreatedLineProductName(mappedLine, sourceLine) : mappedLine;
  });
}
