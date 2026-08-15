import { exportSheetsToXlsx, type ExcelRow } from '@/lib/xlsx-export';
import { registerPdfExportFont } from '@/lib/pdf-export-font';

export type SalesPivotExportCell = string | number;

export interface SalesPivotExportColumn {
  label: string;
  align: 'left' | 'right';
  maximumFractionDigits?: number;
  percent?: boolean;
}

export interface SalesPivotExportMetadata {
  label: string;
  value: string;
}

export interface SalesPivotExportModel {
  fileName: string;
  title: string;
  subtitle: string;
  locale: string;
  columns: SalesPivotExportColumn[];
  rows: SalesPivotExportCell[][];
  totalRow: SalesPivotExportCell[];
  frozenColumnCount: number;
  metadata: SalesPivotExportMetadata[];
}

export interface SalesPivotImageExportResult {
  width: number;
  height: number;
  scale: number;
}

const MAX_CANVAS_EDGE = 12_000;
const MAX_CANVAS_AREA = 42_000_000;
const IMAGE_ROW_HEIGHT = 34;
const IMAGE_TABLE_HEADER_HEIGHT = 58;
const IMAGE_TOTAL_ROW_HEIGHT = 38;
const IMAGE_FOOTER_HEIGHT = 34;

function normalizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'satis-kpi-pivot';
}

function formatCell(
  value: SalesPivotExportCell,
  column: SalesPivotExportColumn,
  locale: string,
): string {
  if (typeof value !== 'number') return String(value ?? '');
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: column.maximumFractionDigits ?? 0,
    maximumFractionDigits: column.maximumFractionDigits ?? 0,
  }).format(value);
  return column.percent ? `%${formatted}` : formatted;
}

function metadataRows(model: SalesPivotExportModel): ExcelRow[] {
  return [
    ['Rapor bilgisi', 'Değer'],
    ['Rapor', model.title],
    ['Dönem', model.subtitle],
    ['Satır sayısı', model.rows.length],
    ['Kolon sayısı', model.columns.length],
    ...model.metadata.map((item) => [item.label, item.value]),
  ];
}

export async function exportSalesPivotToExcel(model: SalesPivotExportModel): Promise<void> {
  await exportSheetsToXlsx(normalizeFileName(model.fileName), [
    {
      name: 'Pivot',
      rows: [
        model.columns.map((column) => column.label),
        ...model.rows,
        model.totalRow,
      ],
    },
    { name: 'Rapor Bilgisi', rows: metadataRows(model) },
  ]);
}

export async function exportSalesPivotToPdf(model: SalesPivotExportModel): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const useA3 = model.columns.length > 12;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: useA3 ? 'a3' : 'a4',
    compress: true,
  });
  const font = await registerPdfExportFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont(font, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(model.title, 28, 30);
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(model.subtitle, 28, 45);
  const metadataText = model.metadata.map((item) => `${item.label}: ${item.value}`).join('  |  ');
  const metadataLines = doc.splitTextToSize(metadataText, pageWidth - 56) as string[];
  doc.text(metadataLines, 28, 58);

  const body = [...model.rows, model.totalRow].map((row) => row.map((value, index) => (
    formatCell(value, model.columns[index], model.locale)
  )));
  const rightAlignedColumns = Object.fromEntries(model.columns
    .map((column, index) => [column, index] as const)
    .filter(([column]) => column.align === 'right')
    .map(([, index]) => [index, { halign: 'right' as const }]));
  const repeatColumns = Array.from(
    { length: Math.min(model.frozenColumnCount, model.columns.length) },
    (_, index) => index,
  );

  autoTable(doc, {
    startY: 64 + metadataLines.length * 10,
    head: [model.columns.map((column) => column.label)],
    body,
    theme: 'grid',
    showHead: 'everyPage',
    horizontalPageBreak: model.columns.length > 10,
    horizontalPageBreakRepeat: repeatColumns,
    styles: {
      font,
      fontStyle: 'normal',
      fontSize: model.columns.length > 16 ? 6 : 7,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.35,
      valign: 'middle',
    },
    headStyles: {
      font,
      fontStyle: 'bold',
      fillColor: [190, 24, 93],
      textColor: 255,
      lineColor: [157, 23, 77],
    },
    columnStyles: rightAlignedColumns,
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [241, 245, 249];
      }
    },
    margin: { top: 28, right: 20, bottom: 28, left: 20 },
    didDrawPage: () => {
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFont(font, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${model.rows.length} satır · ${model.columns.length} kolon · Sayfa ${currentPage}`,
        pageWidth - 28,
        pageHeight - 12,
        { align: 'right' },
      );
    },
  });

  doc.save(`${normalizeFileName(model.fileName)}.pdf`);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function truncateCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  if (context.measureText(value).width <= maxWidth) return value;
  let end = value.length;
  while (end > 1 && context.measureText(`${value.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${value.slice(0, Math.max(1, end))}…`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Tam veri görseli oluşturulamadı.'));
    }, 'image/png');
  });
}

export async function exportSalesPivotToPng(
  model: SalesPivotExportModel,
): Promise<SalesPivotImageExportResult> {
  const sampleRows = model.rows.slice(0, 200);
  const columnWidths = model.columns.map((column, columnIndex) => {
    const longestValue = Math.max(
      column.label.length,
      ...sampleRows.map((row) => formatCell(row[columnIndex] ?? '', column, model.locale).length),
      formatCell(model.totalRow[columnIndex] ?? '', column, model.locale).length,
    );
    return column.align === 'right'
      ? clamp(longestValue * 7.2 + 28, 120, 210)
      : clamp(longestValue * 7.2 + 28, 170, 330);
  });
  const metadataHeight = Math.max(1, model.metadata.length) * 18;
  const reportHeaderHeight = 78 + metadataHeight;
  const logicalWidth = Math.max(960, columnWidths.reduce((sum, width) => sum + width, 0) + 48);
  const logicalHeight = reportHeaderHeight
    + IMAGE_TABLE_HEADER_HEIGHT
    + model.rows.length * IMAGE_ROW_HEIGHT
    + IMAGE_TOTAL_ROW_HEIGHT
    + IMAGE_FOOTER_HEIGHT
    + 30;
  const scale = Math.min(
    1.5,
    MAX_CANVAS_EDGE / logicalWidth,
    MAX_CANVAS_EDGE / logicalHeight,
    Math.sqrt(MAX_CANVAS_AREA / (logicalWidth * logicalHeight)),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(logicalWidth * scale));
  canvas.height = Math.max(1, Math.floor(logicalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tarayıcı görsel oluşturma özelliğini desteklemiyor.');
  context.scale(scale, scale);
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, logicalWidth, logicalHeight);

  const tableLeft = 24;
  const tableWidth = logicalWidth - 48;
  context.fillStyle = '#be185d';
  context.fillRect(0, 0, 8, logicalHeight);
  context.fillStyle = '#0f172a';
  context.font = '700 24px Arial, sans-serif';
  context.fillText(truncateCanvasText(context, model.title, logicalWidth - 80), 24, 30);
  context.fillStyle = '#64748b';
  context.font = '13px Arial, sans-serif';
  context.fillText(truncateCanvasText(context, model.subtitle, logicalWidth - 80), 24, 56);
  model.metadata.forEach((item, index) => {
    const y = 82 + index * 18;
    context.fillStyle = '#94a3b8';
    context.font = '700 10px Arial, sans-serif';
    context.fillText(`${item.label.toLocaleUpperCase('tr-TR')}:`, 24, y);
    const labelWidth = context.measureText(`${item.label.toLocaleUpperCase('tr-TR')}:`).width;
    context.fillStyle = '#334155';
    context.font = '11px Arial, sans-serif';
    context.fillText(
      truncateCanvasText(context, item.value, logicalWidth - labelWidth - 72),
      34 + labelWidth,
      y,
    );
  });

  let y = reportHeaderHeight;
  let x = tableLeft;
  model.columns.forEach((column, index) => {
    const width = columnWidths[index];
    context.fillStyle = '#be185d';
    context.fillRect(x, y, width, IMAGE_TABLE_HEADER_HEIGHT);
    context.strokeStyle = '#9d174d';
    context.strokeRect(x, y, width, IMAGE_TABLE_HEADER_HEIGHT);
    context.fillStyle = '#ffffff';
    context.font = '700 11px Arial, sans-serif';
    const words = column.label.split(' ');
    const firstLine: string[] = [];
    const secondLine: string[] = [];
    for (const word of words) {
      const candidate = [...firstLine, word].join(' ');
      if (context.measureText(candidate).width <= width - 18 || firstLine.length === 0) firstLine.push(word);
      else secondLine.push(word);
    }
    const lines = secondLine.length > 0
      ? [firstLine.join(' '), truncateCanvasText(context, secondLine.join(' '), width - 18)]
      : [truncateCanvasText(context, firstLine.join(' '), width - 18)];
    lines.forEach((line, lineIndex) => {
      const textX = column.align === 'right' ? x + width - 9 : x + 9;
      context.textAlign = column.align;
      context.fillText(line, textX, y + 24 + lineIndex * 15);
    });
    x += width;
  });
  context.textAlign = 'left';
  y += IMAGE_TABLE_HEADER_HEIGHT;

  const drawRow = (row: SalesPivotExportCell[], rowIndex: number, isTotal: boolean): void => {
    const rowHeight = isTotal ? IMAGE_TOTAL_ROW_HEIGHT : IMAGE_ROW_HEIGHT;
    x = tableLeft;
    model.columns.forEach((column, columnIndex) => {
      const width = columnWidths[columnIndex];
      context.fillStyle = isTotal ? '#f1f5f9' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
      context.fillRect(x, y, width, rowHeight);
      context.strokeStyle = '#cbd5e1';
      context.strokeRect(x, y, width, rowHeight);
      context.fillStyle = isTotal ? '#0f172a' : '#334155';
      context.font = `${isTotal ? '700' : '400'} 11px Arial, sans-serif`;
      context.textAlign = column.align;
      const formatted = formatCell(row[columnIndex] ?? '', column, model.locale);
      const textX = column.align === 'right' ? x + width - 9 : x + 9;
      context.fillText(truncateCanvasText(context, formatted, width - 18), textX, y + rowHeight / 2);
      x += width;
    });
    context.textAlign = 'left';
    y += rowHeight;
  };

  model.rows.forEach((row, rowIndex) => drawRow(row, rowIndex, false));
  drawRow(model.totalRow, model.rows.length, true);
  context.fillStyle = '#64748b';
  context.font = '11px Arial, sans-serif';
  context.fillText(
    `Tam veri görünümü · ${model.rows.length} satır · ${model.columns.length} kolon`,
    tableLeft,
    y + 20,
  );
  context.textAlign = 'right';
  context.fillText(new Date().toLocaleString(model.locale), tableLeft + tableWidth, y + 20);

  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${normalizeFileName(model.fileName)}-tam-gorsel.png`);
  return { width: canvas.width, height: canvas.height, scale };
}
