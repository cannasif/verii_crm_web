export interface GridExportColumn {
  key: string;
  label: string;
}

type GridExportRow = Record<string, unknown>;

interface GridExportParams {
  fileName: string;
  columns: GridExportColumn[];
  rows: GridExportRow[];
}

const dynamicImport = (moduleName: string): Promise<unknown> => {
  return new Function('m', 'return import(m)')(moduleName) as Promise<unknown>;
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

const fallbackExportPdf = (params: GridExportParams): void => {
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

  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(fileName)}</title><style>body{font-family:Arial,sans-serif;padding:16px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;text-align:left;font-size:12px;}th{background:#f2f2f2;}</style></head><body><h2>${escapeHtml(fileName)}</h2><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=760');
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
};

interface XLSXModule {
  utils: {
    json_to_sheet: (data: Record<string, string | number>[]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (workbook: unknown, sheet: unknown, name: string) => void;
  };
  writeFile: (workbook: unknown, filename: string) => void;
}

export async function exportGridToExcel(params: GridExportParams): Promise<void> {
  const exportRows = mapRowsForExport(params.columns, params.rows);
  try {
    const XLSX = (await dynamicImport('xlsx')) as XLSXModule;
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${params.fileName}.xlsx`);
  } catch {
    fallbackExportExcel(params);
  }
}

interface JsPDFConstructor {
  new (options?: { orientation?: 'landscape' }): { save: (filename: string) => void };
}
type AutoTableFn = (doc: unknown, options: Record<string, unknown>) => void;

export async function exportGridToPdf(params: GridExportParams): Promise<void> {
  const exportRows = mapRowsForExport(params.columns, params.rows);
  try {
    const [jspdfMod, autoTableMod] = await Promise.all([
      dynamicImport('jspdf') as Promise<{ default: JsPDFConstructor }>,
      dynamicImport('jspdf-autotable') as Promise<{ default: AutoTableFn }>,
    ]);
    const JsPDF = jspdfMod.default;
    const autoTable = autoTableMod.default;

    const doc = new JsPDF({ orientation: 'landscape' });
    const head = [params.columns.map((column) => column.label)];
    const body = exportRows.map((row) => params.columns.map((column) => row[column.label] ?? ''));

    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [27, 39, 66] },
      margin: { top: 20 },
    });

    doc.save(`${params.fileName}.pdf`);
  } catch {
    fallbackExportPdf(params);
  }
}
