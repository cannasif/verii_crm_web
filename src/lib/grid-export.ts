import { exportObjectsToXlsx } from './xlsx-export';
import { registerPdfExportFont } from './pdf-export-font';

export interface GridExportColumn {
  key: string;
  label: string;
}

type GridExportRow = Record<string, unknown>;

interface GridExportParams {
  fileName: string;
  columns: GridExportColumn[];
  rows: GridExportRow[];
  pdfRightAlignedColumnKeys?: readonly string[];
}

const buildPdfRightAlignedColumnStyles = (
  columns: GridExportColumn[],
  rightAlignedColumnKeys?: readonly string[]
): Record<number, { halign: 'right' }> | undefined => {
  if (!rightAlignedColumnKeys?.length) {
    return undefined;
  }

  const rightAlignedKeys = new Set(rightAlignedColumnKeys);
  const columnStyles: Record<number, { halign: 'right' }> = {};

  columns.forEach((column, index) => {
    if (rightAlignedKeys.has(column.key)) {
      columnStyles[index] = { halign: 'right' };
    }
  });

  return Object.keys(columnStyles).length > 0 ? columnStyles : undefined;
};

const normalizeCellValue = (value: unknown): string | number => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const mapRowsForExport = (
  columns: GridExportColumn[],
  rows: GridExportRow[]
): Record<string, string | number>[] => {
  return rows.map((row) => {
    const mapped: Record<string, string | number> = {};
    columns.forEach((column) => {
      mapped[column.label] = normalizeCellValue(row[column.key]);
    });
    return mapped;
  });
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCsvCell = (value: unknown): string => {
  const normalized = String(normalizeCellValue(value));
  return /[",\r\n]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
};

export function exportGridToCsv(params: GridExportParams): void {
  const header = params.columns.map((column) => escapeCsvCell(column.label)).join(',');
  const body = params.rows.map((row) =>
    params.columns.map((column) => escapeCsvCell(row[column.key])).join(',')
  );
  const csv = `\uFEFF${[header, ...body].join('\r\n')}`;
  const normalizedFileName = params.fileName.toLowerCase().endsWith('.csv')
    ? params.fileName
    : `${params.fileName}.csv`;

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), normalizedFileName);
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const fallbackExportExcel = (params: GridExportParams): void => {
  const { fileName, columns, rows } = params;
  const headers = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeHtml(String(normalizeCellValue(row[column.key])))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${fileName}.xls`);
};

export async function exportGridToExcel(params: GridExportParams): Promise<void> {
  const exportRows = mapRowsForExport(params.columns, params.rows);
  try {
    await exportObjectsToXlsx(`${params.fileName}.xlsx`, 'Sheet1', exportRows);
  } catch {
    fallbackExportExcel(params);
  }
}

export async function exportGridToPdf(params: GridExportParams): Promise<void> {
  const exportRows = mapRowsForExport(params.columns, params.rows);
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pdfFont = await registerPdfExportFont(doc);
  const head = [params.columns.map((column) => column.label)];
  const body = exportRows.map((row) => params.columns.map((column) => row[column.label] ?? ''));
  const columnStyles = buildPdfRightAlignedColumnStyles(params.columns, params.pdfRightAlignedColumnKeys);

  autoTable(doc, {
    head,
    body,
    theme: 'grid',
    ...(columnStyles ? { columnStyles } : {}),
    styles: {
      font: pdfFont,
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      lineColor: [180, 188, 200],
      lineWidth: 0.35,
    },
    headStyles: {
      font: pdfFont,
      fontStyle: 'bold',
      fillColor: [27, 39, 66],
      textColor: 255,
      lineColor: [27, 39, 66],
      lineWidth: 0.35,
    },
    bodyStyles: {
      font: pdfFont,
      fontStyle: 'normal',
      lineColor: [180, 188, 200],
      lineWidth: 0.35,
    },
    margin: { top: 24, left: 12, right: 12 },
    tableWidth: 'auto',
  });

  const blob = doc.output('blob');
  downloadBlob(blob, `${params.fileName}.pdf`);
}
