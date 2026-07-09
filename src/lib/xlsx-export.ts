type NormalizedExcelCellValue = string | number | boolean | Date;
type ExcelCellValue = unknown;

export type ExcelRow = ExcelCellValue[];

export interface ExcelSheet {
  name: string;
  rows: ExcelRow[];
}

interface StyledExcelCell {
  value: NormalizedExcelCellValue;
  type?: typeof String | typeof Number | typeof Boolean | typeof Date;
  format?: string;
  fontWeight?: 'bold';
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
}

interface ExcelColumnWidth {
  width: number;
}

interface WriteExcelSheet {
  data: StyledExcelCell[][];
  sheet: string;
  columns: ExcelColumnWidth[];
  stickyRowsCount?: number;
}

type WriteExcelFile = (sheets: WriteExcelSheet[]) => {
  toFile: (fileName: string) => Promise<void>;
};

const EXCEL_EXPORT_THEME = {
  header: {
    fontWeight: 'bold' as const,
    backgroundColor: '#1B2742',
    textColor: '#FFFFFF',
    align: 'center' as const,
  },
  bodyFontSize: 11,
  numberFormat: '#,##0.00',
  dateFormat: 'dd/mm/yyyy',
  minColumnWidth: 10,
  maxColumnWidth: 42,
  columnPadding: 2,
};

const toCellValue = (value: ExcelCellValue): NormalizedExcelCellValue => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value;
  return String(value);
};

const isNumericValue = (value: NormalizedExcelCellValue): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getCellDisplayText = (value: ExcelCellValue): string => {
  const normalized = toCellValue(value);
  if (isNumericValue(normalized)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalized);
  }
  if (typeof normalized === 'boolean') return normalized ? 'TRUE' : 'FALSE';
  if (normalized instanceof Date) return normalized.toLocaleDateString('tr-TR');
  return String(normalized);
};

const calculateColumnWidths = (rows: ExcelRow[]): ExcelColumnWidth[] => {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (columnCount === 0) return [];

  const widths = Array.from({ length: columnCount }, () => EXCEL_EXPORT_THEME.minColumnWidth);

  rows.forEach((row) => {
    row.forEach((cell, columnIndex) => {
      const displayLength = getCellDisplayText(cell).length + EXCEL_EXPORT_THEME.columnPadding;
      widths[columnIndex] = Math.max(widths[columnIndex], displayLength);
    });
  });

  return widths.map((width) => ({
    width: Math.min(Math.max(width, EXCEL_EXPORT_THEME.minColumnWidth), EXCEL_EXPORT_THEME.maxColumnWidth),
  }));
};

const buildStyledCell = (value: ExcelCellValue, isHeader: boolean): StyledExcelCell => {
  const normalized = toCellValue(value);

  if (isHeader) {
    return {
      value: normalized,
      fontWeight: EXCEL_EXPORT_THEME.header.fontWeight,
      backgroundColor: EXCEL_EXPORT_THEME.header.backgroundColor,
      textColor: EXCEL_EXPORT_THEME.header.textColor,
      align: EXCEL_EXPORT_THEME.header.align,
      wrap: true,
    };
  }

  if (isNumericValue(normalized)) {
    return {
      value: normalized,
      type: Number,
      format: EXCEL_EXPORT_THEME.numberFormat,
      align: 'right',
      fontSize: EXCEL_EXPORT_THEME.bodyFontSize,
    };
  }

  if (normalized instanceof Date) {
    return {
      value: normalized,
      type: Date,
      format: EXCEL_EXPORT_THEME.dateFormat,
      fontSize: EXCEL_EXPORT_THEME.bodyFontSize,
    };
  }

  if (typeof normalized === 'boolean') {
    return {
      value: normalized,
      type: Boolean,
      align: 'center',
      fontSize: EXCEL_EXPORT_THEME.bodyFontSize,
    };
  }

  return {
    value: normalized,
    fontSize: EXCEL_EXPORT_THEME.bodyFontSize,
    wrap: String(normalized).length > EXCEL_EXPORT_THEME.maxColumnWidth,
  };
};

const toStyledExcelRows = (rows: ExcelRow[]): StyledExcelCell[][] => {
  const safeRows = rows.length > 0 ? rows : [[]];
  return safeRows.map((row, rowIndex) => row.map((cell) => buildStyledCell(cell, rowIndex === 0)));
};

const normalizeFileName = (fileName: string): string => {
  return fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
};

export async function exportSheetsToXlsx(fileName: string, sheets: ExcelSheet[]): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const writeFile = writeXlsxFile as unknown as WriteExcelFile;
  const safeSheets = sheets.length > 0 ? sheets : [{ name: 'Sheet1', rows: [] }];

  const file = writeFile(
    safeSheets.map((sheet) => ({
      data: toStyledExcelRows(sheet.rows),
      sheet: sheet.name,
      columns: calculateColumnWidths(sheet.rows),
      stickyRowsCount: sheet.rows.length > 1 ? 1 : undefined,
    }))
  );
  await file.toFile(normalizeFileName(fileName));
}

export async function exportObjectsToXlsx(
  fileName: string,
  sheetName: string,
  rows: Array<Record<string, ExcelCellValue>>
): Promise<void> {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const sheetRows: ExcelRow[] = headers.length > 0
    ? [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    : [];

  await exportSheetsToXlsx(fileName, [{ name: sheetName, rows: sheetRows }]);
}
