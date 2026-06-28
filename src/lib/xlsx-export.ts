type NormalizedExcelCellValue = string | number | boolean | Date;
type ExcelCellValue = unknown;

export type ExcelRow = ExcelCellValue[];

export interface ExcelSheet {
  name: string;
  rows: ExcelRow[];
}

type WriteExcelFile = (
  sheets: Array<{
    data: Array<Array<{ value: NormalizedExcelCellValue }>>;
    sheet: string;
  }>
) => {
  toFile: (fileName: string) => Promise<void>;
};

const toCellValue = (value: ExcelCellValue): NormalizedExcelCellValue => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value;
  return String(value);
};

const toWriteExcelRows = (rows: ExcelRow[]): Array<Array<{ value: NormalizedExcelCellValue }>> => {
  const safeRows = rows.length > 0 ? rows : [[]];
  return safeRows.map((row) => row.map((value) => ({ value: toCellValue(value) })));
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
      data: toWriteExcelRows(sheet.rows),
      sheet: sheet.name,
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
