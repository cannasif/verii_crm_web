import { PDFDocument } from 'pdf-lib';
import { resolveAppPath } from '@/lib/api-config';
import { formatCurrency } from './format-currency';

const ATLAS_COVER_PDF_PATH = '/pdf-templates/atlas-cover-first-3-pages.pdf';
const PDF_FONT_PATH = '/fonts/arial.ttf';
const PDF_FONT_NAME = 'ArialCustom';

interface TranslationFn {
  (key: string, options?: Record<string, unknown>): string;
}

interface ExportQuotationLine {
  productCode?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
  discountRate1?: number | null;
  discountAmount1?: number | null;
  discountRate2?: number | null;
  discountAmount2?: number | null;
  discountRate3?: number | null;
  discountAmount3?: number | null;
}

interface ExportQuotationLinesPdfParams {
  fileName: string;
  title: string;
  currencyCode: string;
  lines: ExportQuotationLine[];
  offerNo?: string | null;
  customerName?: string | null;
  metaFields?: Array<{ label: string; value?: string | null }>;
  t: TranslationFn;
}

interface CurrencyPresentation {
  code: string;
  label: string;
}

function normalizeCustomerAccountName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  const erpMatch = trimmed.match(/^ERP:\s*[^-]+-\s*(.+)$/i);
  if (erpMatch?.[1]) {
    return erpMatch[1].trim();
  }

  return trimmed;
}

function normalizeMetaFields(
  fields: Array<{ label: string; value?: string | null }> | undefined
): Array<{ label: string; value: string }> {
  return (fields ?? [])
    .map((field) => ({
      label: field.label?.trim() ?? "",
      value: field.value?.trim() ?? "",
    }))
    .filter((field) => field.label && field.value);
}

function getCurrencyPresentation(value: string | null | undefined): CurrencyPresentation {
  const normalized = String(value ?? 'TRY').trim().toUpperCase();

  switch (normalized) {
    case '0':
    case 'TL':
    case 'TRY':
      return { code: 'TRY', label: 'Türk Lirası' };
    case '1':
    case 'USD':
      return { code: 'USD', label: 'ABD Doları' };
    case '2':
    case 'EUR':
      return { code: 'EUR', label: 'Euro' };
    case '3':
    case 'GBP':
      return { code: 'GBP', label: 'İngiliz Sterlini' };
    default:
      return { code: normalized || 'TRY', label: normalized || 'Türk Lirası' };
  }
}

function downloadPdfBlob(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function buildLinesPdfBytes(params: ExportQuotationLinesPdfParams): Promise<ArrayBuffer> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'portrait' });
  const currency = getCurrencyPresentation(params.currencyCode);
  const fontResponse = await fetch(resolveAppPath(PDF_FONT_PATH), { cache: 'force-cache' });
  if (fontResponse.ok) {
    const fontBytes = await fontResponse.arrayBuffer();
    const fontBinary = Array.from(new Uint8Array(fontBytes), (byte) =>
      String.fromCharCode(byte)
    ).join('');
    doc.addFileToVFS('arial.ttf', fontBinary);
    doc.addFont('arial.ttf', PDF_FONT_NAME, 'normal');
    doc.setFont(PDF_FONT_NAME, 'normal');
  }

  doc.setFontSize(18);
  doc.text(params.title, 14, 20);
  doc.setFontSize(11);
  doc.text(`${params.t('quotation.date')}: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
  const normalizedMetaFields = normalizeMetaFields(params.metaFields);
  doc.text(`${params.t('quotation.offerNo', { defaultValue: 'Teklif No' })}: ${params.offerNo ?? '-'}`, 14, 36);
  const customerAccountName = normalizeCustomerAccountName(params.customerName);
  doc.text(`${params.t('quotation.currency', { defaultValue: 'Döviz' })}: ${currency.label}`, 14, 44);  
  const baseMetaFields = [
    ...(customerAccountName
      ? [{ label: params.t('quotation.customerAccount'), value: customerAccountName }]
      : []),
    ...normalizedMetaFields,
  ];

  const metaColumnX = [14, 108];
  let currentMetaY = 52;
  baseMetaFields.forEach((field, index) => {
    const columnIndex = index % 2;
    const rowIndex = Math.floor(index / 2);
    const y = 52 + rowIndex * 8;
    doc.text(`${field.label}: ${field.value}`, metaColumnX[columnIndex], y, {
      maxWidth: columnIndex === 0 ? 86 : 86,
    });
    currentMetaY = Math.max(currentMetaY, y);
  });

  const tableStartY = currentMetaY + 10;

  const headers = [[
    params.t('quotation.lines.productCode'),
    params.t('quotation.lines.productName'),
    params.t('quotation.discount1', { defaultValue: 'İskonto 1' }),
    params.t('quotation.discount2', { defaultValue: 'İskonto 2' }),
    params.t('quotation.discount3', { defaultValue: 'İskonto 3' }),
    params.t('quotation.lines.quantity'),
    params.t('quotation.lines.unitPrice'),
    params.t('quotation.currency', { defaultValue: 'Döviz' }),
    params.t('quotation.lines.vatRate'),
    params.t('quotation.lines.total'),
  ]];

  const data = params.lines.map((line) => [
    line.productCode ?? '',
    line.productName,
    `%${line.discountRate1 ?? 0}`,
    `%${line.discountRate2 ?? 0}`,
    `%${line.discountRate3 ?? 0}`,
    line.quantity,
    formatCurrency(line.unitPrice, currency.code),
    currency.label,
    `%${line.vatRate}`,
    formatCurrency(line.lineTotal, currency.code),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: headers,
    body: data,
    styles: {
      font: PDF_FONT_NAME,
      fontStyle: 'normal',
      fontSize: 7.5,
      cellPadding: 1.6,
      overflow: 'linebreak',
      valign: 'middle',
    },
    theme: 'grid',
    headStyles: { font: PDF_FONT_NAME, fontStyle: 'normal' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 12, halign: 'right' },
      3: { cellWidth: 12, halign: 'right' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 16 },
      8: { cellWidth: 12, halign: 'right' },
      9: { cellWidth: 23, halign: 'right' },
    },
  });

  return doc.output('arraybuffer') as ArrayBuffer;
}

async function mergeAtlasCoverWithLinesPdf(linesPdfBytes: ArrayBuffer): Promise<Blob> {
  const coverResponse = await fetch(resolveAppPath(ATLAS_COVER_PDF_PATH), {
    cache: 'no-cache',
  });

  if (!coverResponse.ok) {
    throw new Error(`Atlas cover PDF yüklenemedi: ${coverResponse.status}`);
  }

  const coverPdfBytes = await coverResponse.arrayBuffer();
  const mergedPdf = await PDFDocument.create();
  const [coverPdf, linesPdf] = await Promise.all([
    PDFDocument.load(coverPdfBytes),
    PDFDocument.load(linesPdfBytes),
  ]);

  const coverPages = await mergedPdf.copyPages(
    coverPdf,
    coverPdf.getPageIndices()
  );
  coverPages.forEach((page) => mergedPdf.addPage(page));

  const linePages = await mergedPdf.copyPages(
    linesPdf,
    linesPdf.getPageIndices()
  );
  linePages.forEach((page) => mergedPdf.addPage(page));

  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes], { type: 'application/pdf' });
}

export async function createQuotationLinesPdfBlob(
  params: ExportQuotationLinesPdfParams
): Promise<Blob> {
  const linesPdfBytes = await buildLinesPdfBytes(params);

  try {
    return await mergeAtlasCoverWithLinesPdf(linesPdfBytes);
  } catch {
    return new Blob([linesPdfBytes], { type: 'application/pdf' });
  }
}

export async function exportQuotationLinesPdf(params: ExportQuotationLinesPdfParams): Promise<void> {
  const blob = await createQuotationLinesPdfBlob(params);
  downloadPdfBlob(blob, params.fileName);
}
