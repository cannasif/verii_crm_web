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
  t: TranslationFn;
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

  const doc = new JsPDF({ orientation: 'landscape' });
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
  doc.text(`${params.t('quotation.offerNo', { defaultValue: 'Teklif No' })}: ${params.offerNo ?? '-'}`, 14, 36);
  const customerAccountName = normalizeCustomerAccountName(params.customerName);
  const tableStartY = customerAccountName ? 50 : 42;
  if (customerAccountName) {
    doc.text(`${params.t('quotation.customerAccount')}: ${customerAccountName}`, 14, 44);
  }

  const headers = [[
    params.t('quotation.lines.productCode'),
    params.t('quotation.lines.productName'),
    params.t('quotation.discount', { defaultValue: 'İskonto' }),
    params.t('quotation.lines.quantity'),
    params.t('quotation.lines.unitPrice'),
    params.t('quotation.lines.vatRate'),
    params.t('quotation.lines.total'),
  ]];

  const formatDiscountText = (line: ExportQuotationLine): string => {
    const parts: string[] = [];

    if ((line.discountRate1 ?? 0) > 0 || (line.discountAmount1 ?? 0) > 0) {
      parts.push(`1:%${line.discountRate1 ?? 0}`);
    }
    if ((line.discountRate2 ?? 0) > 0 || (line.discountAmount2 ?? 0) > 0) {
      parts.push(`2:%${line.discountRate2 ?? 0}`);
    }
    if ((line.discountRate3 ?? 0) > 0 || (line.discountAmount3 ?? 0) > 0) {
      parts.push(`3:%${line.discountRate3 ?? 0}`);
    }

    const totalDiscountAmount =
      (line.discountAmount1 ?? 0) +
      (line.discountAmount2 ?? 0) +
      (line.discountAmount3 ?? 0);

    if (totalDiscountAmount > 0) {
      parts.push(`${params.t('total', { ns: 'common', defaultValue: 'Toplam' })}: ${formatCurrency(totalDiscountAmount, params.currencyCode)}`);
    }

    return parts.join(' | ') || '-';
  };

  const data = params.lines.map((line) => [
    line.productCode ?? '',
    line.productName,
    formatDiscountText(line),
    line.quantity,
    formatCurrency(line.unitPrice, params.currencyCode),
    `%${line.vatRate}`,
    formatCurrency(line.lineTotal, params.currencyCode),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: headers,
    body: data,
    styles: { font: PDF_FONT_NAME, fontStyle: 'normal', fontSize: 9, cellPadding: 2.5 },
    theme: 'grid',
    headStyles: { font: PDF_FONT_NAME, fontStyle: 'normal' },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 88 },
      2: { cellWidth: 72 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
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

export async function exportQuotationLinesPdf(params: ExportQuotationLinesPdfParams): Promise<void> {
  const linesPdfBytes = await buildLinesPdfBytes(params);

  try {
    const mergedBlob = await mergeAtlasCoverWithLinesPdf(linesPdfBytes);
    downloadPdfBlob(mergedBlob, params.fileName);
    return;
  } catch {
    const fallbackBlob = new Blob([linesPdfBytes], { type: 'application/pdf' });
    downloadPdfBlob(fallbackBlob, params.fileName);
  }
}
