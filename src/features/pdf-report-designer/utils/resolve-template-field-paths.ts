import type { PdfCanvasElement, PdfTableColumn } from '../types/pdf-report-template.types';
import { isPdfTableElement } from '../types/pdf-report-template.types';

export interface PdfFieldLike {
  label: string;
  path: string;
  exampleValue?: string;
}

export function findTemplateField(
  fields: PdfFieldLike[],
  pathKeywords: string[],
  labelKeywords: string[] = []
): PdfFieldLike | undefined {
  if (fields.length === 0) return undefined;

  return fields.find((field) => {
    const path = field.path.toLowerCase();
    const label = field.label.toLowerCase();
    return (
      pathKeywords.some((keyword) => path.includes(keyword.toLowerCase())) ||
      labelKeywords.some((keyword) => label.includes(keyword.toLowerCase()))
    );
  });
}

export function resolveTemplateField(
  fields: PdfFieldLike[],
  pathKeywords: string[],
  labelKeywords: string[] = []
): PdfFieldLike | undefined {
  return findTemplateField(fields, pathKeywords, labelKeywords);
}

function pathExistsInFields(path: string | undefined, fields: PdfFieldLike[]): boolean {
  if (!path?.trim()) return false;
  return fields.some((field) => field.path === path);
}

function resolveHeaderFieldPath(
  headerFields: PdfFieldLike[],
  currentPath: string | undefined,
  pathKeywords: string[],
  labelKeywords: string[]
): string | undefined {
  if (pathExistsInFields(currentPath, headerFields)) return currentPath;

  const byLabel = currentPath
    ? headerFields.find((field) => field.path.toLowerCase() === currentPath.toLowerCase())
    : undefined;
  if (byLabel) return byLabel.path;

  return resolveTemplateField(headerFields, pathKeywords, labelKeywords)?.path;
}

function resolveLineFieldPath(
  lineFields: PdfFieldLike[],
  currentPath: string | undefined,
  label: string,
  pathKeywords: string[],
  labelKeywords: string[] = []
): string | undefined {
  if (pathExistsInFields(currentPath, lineFields)) return currentPath;

  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel) {
    const exactLabel = lineFields.find((field) => field.label.trim().toLowerCase() === normalizedLabel);
    if (exactLabel) return exactLabel.path;
  }

  if (currentPath) {
    const bySuffix = lineFields.find((field) => {
      const suffix = field.path.split('.').pop()?.toLowerCase() ?? '';
      const currentSuffix = currentPath.split('.').pop()?.toLowerCase() ?? '';
      return suffix === currentSuffix;
    });
    if (bySuffix) return bySuffix.path;
  }

  return resolveTemplateField(lineFields, pathKeywords, labelKeywords)?.path;
}

const HEADER_FIELD_RULES: Array<{
  pathKeywords: string[];
  labelKeywords: string[];
}> = [
  { pathKeywords: ['branchname', 'warehousename', 'representationbranch', 'branch'], labelKeywords: ['sube', 'depo', 'veren'] },
  { pathKeywords: ['branchcode', 'warehousecode', 'branchid'], labelKeywords: ['sube kod', 'depo kod'] },
  { pathKeywords: ['potentialcustomername', 'customername', 'erpcustomername'], labelKeywords: ['musteri', 'cari', 'verilen'] },
  { pathKeywords: ['offerdate', 'quotationdate', 'createddate'], labelKeywords: ['tarih', 'teklif tarih'] },
  { pathKeywords: ['offerno', 'quotationno', 'documentno'], labelKeywords: ['teklif no', 'belge no'] },
  { pathKeywords: ['revisionno'], labelKeywords: ['revizyon'] },
  { pathKeywords: ['currency', 'currencycode'], labelKeywords: ['para birim', 'doviz'] },
  { pathKeywords: ['description', 'notes'], labelKeywords: ['aciklama', 'not'] },
];

const LINE_COLUMN_RULES: Array<{
  pathKeywords: string[];
  labelKeywords: string[];
}> = [
  { pathKeywords: ['productcode', 'stockcode'], labelKeywords: ['stok kod', 'kod'] },
  { pathKeywords: ['productname', 'stockname', 'description'], labelKeywords: ['stok ad', 'aciklama', 'urun'] },
  { pathKeywords: ['quantity', 'qty'], labelKeywords: ['miktar'] },
  { pathKeywords: ['unitprice', 'netunit', 'price'], labelKeywords: ['birim fiyat', 'net birim'] },
  { pathKeywords: ['linetotal', 'nettotal', 'total'], labelKeywords: ['toplam', 'net toplam'] },
  { pathKeywords: ['imageurl', 'defaultimagepath'], labelKeywords: ['gorsel', 'resim'] },
];

export interface RebindTemplateFieldPathsResult {
  elements: PdfCanvasElement[];
  changed: boolean;
  unresolvedFieldCount: number;
  unresolvedColumnCount: number;
}

export function rebindTemplateFieldPaths(
  elements: PdfCanvasElement[],
  headerFields: PdfFieldLike[],
  lineFields: PdfFieldLike[]
): RebindTemplateFieldPathsResult {
  let changed = false;
  let unresolvedFieldCount = 0;
  let unresolvedColumnCount = 0;

  const rebound = elements.map((element) => {
    if (isPdfTableElement(element) && element.section === 'page') {
      changed = true;
      element = { ...element, section: 'content' };
    } else if (element.type === 'quotationTotals' && element.section === 'page') {
      changed = true;
      element = { ...element, section: 'content' };
    }

    if (element.type === 'field') {
      const rules =
        HEADER_FIELD_RULES.find((rule) => {
          if (!element.path) return false;
          const suffix = element.path.split('.').pop()?.toLowerCase() ?? '';
          return rule.pathKeywords.some((keyword) => suffix.includes(keyword.toLowerCase()));
        }) ?? HEADER_FIELD_RULES[0];

      const resolvedPath = resolveHeaderFieldPath(
        headerFields,
        element.path,
        rules.pathKeywords,
        rules.labelKeywords
      );

      if (!resolvedPath) {
        unresolvedFieldCount += 1;
        return element;
      }

      if (resolvedPath !== element.path) changed = true;
      const matched = headerFields.find((field) => field.path === resolvedPath);
      return {
        ...element,
        path: resolvedPath,
        value: matched?.label ?? element.value,
        text: matched?.label ?? element.text,
      };
    }

    if (!isPdfTableElement(element)) return element;

    const reboundColumns = element.columns.map((column) => {
      const rules =
        LINE_COLUMN_RULES.find((rule) => {
          if (!column.path) return false;
          const suffix = column.path.split('.').pop()?.toLowerCase() ?? '';
          return rule.pathKeywords.some((keyword) => suffix.includes(keyword.toLowerCase()));
        }) ??
        LINE_COLUMN_RULES.find((rule) =>
          rule.labelKeywords.some((keyword) => column.label.toLowerCase().includes(keyword))
        ) ??
        LINE_COLUMN_RULES[0];

      const resolvedPath = resolveLineFieldPath(
        lineFields,
        column.path,
        column.label,
        rules.pathKeywords,
        rules.labelKeywords
      );

      if (!resolvedPath) {
        unresolvedColumnCount += 1;
        return column;
      }

      if (resolvedPath !== column.path) changed = true;
      const matched = lineFields.find((field) => field.path === resolvedPath);
      return {
        ...column,
        path: resolvedPath,
        label: matched?.label ?? column.label,
      } satisfies PdfTableColumn;
    });

    if (reboundColumns.some((column, index) => column.path !== element.columns[index]?.path)) {
      changed = true;
    }

    let nextTableOptions = element.tableOptions;
    if (element.tableOptions?.presetName === 'quotation-preview-v3rii') {
      const { presetName: _removed, ...restOptions } = element.tableOptions;
      void _removed;
      nextTableOptions = restOptions;
      changed = true;
    }

    return {
      ...element,
      columns: reboundColumns,
      tableOptions: nextTableOptions,
    };
  });

  return {
    elements: rebound,
    changed,
    unresolvedFieldCount,
    unresolvedColumnCount,
  };
}

export function countBoundTemplateFields(elements: PdfCanvasElement[]): number {
  let count = 0;

  for (const element of elements) {
    if (element.type === 'field' && element.path?.trim()) {
      count += 1;
    }
    if (isPdfTableElement(element)) {
      count += element.columns.filter((column) => Boolean(column.path?.trim())).length;
    }
  }

  return count;
}

export interface V3riiTableColumnSlot {
  pathKeywords: string[];
  labelKeywords: string[];
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'date' | 'image';
}

export const V3RII_QUOTATION_TABLE_SLOTS: V3riiTableColumnSlot[] = [
  { pathKeywords: ['productcode', 'stockcode'], labelKeywords: ['stok kod'], width: 130, align: 'left', format: 'text' },
  { pathKeywords: ['productname', 'stockname'], labelKeywords: ['stok ad', 'aciklama', 'urun ad'], align: 'left', format: 'text' },
  { pathKeywords: ['quantity', 'qty'], labelKeywords: ['miktar'], width: 90, align: 'center', format: 'number' },
  { pathKeywords: ['unitprice', 'netunit'], labelKeywords: ['net birim', 'birim fiyat'], width: 130, align: 'right', format: 'currency' },
  { pathKeywords: ['linetotal', 'nettotal'], labelKeywords: ['toplam', 'net toplam'], width: 140, align: 'right', format: 'currency' },
];

function inferColumnFormat(path: string): PdfTableColumn['format'] {
  const normalized = path.toLowerCase();
  if (normalized.includes('image')) return 'image';
  if (normalized.includes('quantity') || normalized.includes('miktar') || normalized.includes('qty')) return 'number';
  if (
    normalized.includes('price') ||
    normalized.includes('total') ||
    normalized.includes('amount') ||
    normalized.includes('fiyat') ||
    normalized.includes('tutar')
  ) {
    return 'currency';
  }
  return 'text';
}

function inferColumnAlign(path: string, format: PdfTableColumn['format']): PdfTableColumn['align'] {
  if (format === 'number' || format === 'currency') return 'right';
  if (format === 'image') return 'center';
  if (path.toLowerCase().includes('quantity') || path.toLowerCase().includes('miktar')) return 'center';
  return 'left';
}

export function buildV3riiTableColumns(lineFields: PdfFieldLike[]): PdfTableColumn[] {
  const slotted = V3RII_QUOTATION_TABLE_SLOTS.map((slot) => {
    const matched = resolveTemplateField(lineFields, slot.pathKeywords, slot.labelKeywords);
    if (!matched) return null;
    return {
      label: matched.label,
      path: matched.path,
      width: slot.width,
      align: slot.align,
      format: slot.format,
    };
  }).filter((column) => column != null);

  if (slotted.length >= 3) return slotted;

  return lineFields
    .filter((field) => {
      const path = field.path.toLowerCase();
      return path.startsWith('lines.') && !path.includes('image');
    })
    .slice(0, 5)
    .map((field, index) => {
      const format = inferColumnFormat(field.path);
      return {
        label: field.label,
        path: field.path,
        width: index === 0 ? 130 : undefined,
        align: inferColumnAlign(field.path, format),
        format,
      } satisfies PdfTableColumn;
    });
}
