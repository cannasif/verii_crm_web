import { PDFDocument } from 'pdf-lib';
import { resolveAppPath } from '@/lib/api-config';
import { formatCurrency } from './format-currency';

const ATLAS_COVER_PDF_PATH = '/pdf-templates/atlas-cover-first-3-pages.pdf';
const PDF_FONT_PATH = '/fonts/arial.ttf';
const PDF_FONT_NAME = 'ArialCustom';
const BRAND_LOGO_PATH = '/logo.png';
const REFERENCE_IMAGE_PATHS = ['/logo.png', '/login.jpg', '/v3rii.jpeg'] as const;

const COMPANY_NAME = 'WINDOFORM KAPI & PENCERE AKS.';
const COMPANY_CONTACT_LINES = [
  'Kazım Karabekir Mah. 8501 Sokak No:7-B D:18 Buca / İzmir',
  '(0232) 854 70 00',
  'info@windoform.com.tr',
];
const TERMS_LINES = [
  'Yukarıdaki fiyatlara KDV dahil değildir.',
  'Bu teklif oluşturulduktan sonra 15 gün geçerlidir.',
  'Fiyatlara fabrika teslimi (veya belirtilen teslim şekline göre) fiyatlandırma dahildir.',
  'Ödemeler sipariş onayı ile %30 peşin, kalan teslimatta yapılır.',
  'Belirtilen teslim tarihi sipariş onayından itibaren geçerlidir.',
];

interface TranslationFn {
  (key: string, options?: Record<string, unknown>): string;
}

interface ExportQuotationLine {
  productCode?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount?: number | null;
  lineTotal: number;
  lineGrandTotal?: number | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
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
  representativeName?: string | null;
  address?: string | null;
  shippingAddress?: string | null;
  erpCustomerCode?: string | null;
  offerDate?: string | null;
  deliveryDate?: string | null;
  validUntil?: string | null;
  paymentTypeName?: string | null;
  salesTypeName?: string | null;
  projectCode?: string | null;
  description?: string | null;
  metaFields?: Array<{ label: string; value?: string | null }>;
  notes?: string[];
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
      label: field.label?.trim() ?? '',
      value: field.value?.trim() ?? '',
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = value.includes('T') ? value.split('T')[0] : value;
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString('tr-TR');
}

function buildDescription(line: ExportQuotationLine): string {
  const extra = [line.description1, line.description2, line.description3]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(' • ');

  if (!extra) return line.productName;
  return `${line.productName}\n${extra}`;
}

function buildDiscountSummary(line: ExportQuotationLine): string {
  return [
    line.discountRate1 ? `%${line.discountRate1}` : '%0',
    line.discountRate2 ? `%${line.discountRate2}` : '%0',
    line.discountRate3 ? `%${line.discountRate3}` : '%0',
  ].join(' / ');
}

function calculateTotals(lines: ExportQuotationLine[]): {
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
} {
  return lines.reduce(
    (acc, line) => {
      const grossLineTotal = (line.quantity || 0) * (line.unitPrice || 0);
      const discountAmount =
        (line.discountAmount1 || 0) + (line.discountAmount2 || 0) + (line.discountAmount3 || 0);
      const netTotal = line.lineTotal || 0;
      const vatTotal = line.vatAmount || Math.max((line.lineGrandTotal || 0) - netTotal, 0);
      const grandTotal = line.lineGrandTotal || netTotal + vatTotal;

      acc.grossTotal += grossLineTotal;
      acc.discountTotal += discountAmount;
      acc.netTotal += netTotal;
      acc.vatTotal += vatTotal;
      acc.grandTotal += grandTotal;
      return acc;
    },
    { grossTotal: 0, discountTotal: 0, netTotal: 0, vatTotal: 0, grandTotal: 0 }
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Blob okunamadı'));
    reader.readAsDataURL(blob);
  });
}

async function fetchAssetAsDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(resolveAppPath(path), { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
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

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currency = getCurrencyPresentation(params.currencyCode);
  const totals = calculateTotals(params.lines);
  const [logoDataUrl, ...referenceDataUrls] = await Promise.all([
    fetchAssetAsDataUrl(BRAND_LOGO_PATH),
    ...REFERENCE_IMAGE_PATHS.map((path) => fetchAssetAsDataUrl(path)),
  ]);

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

  const customerName = normalizeCustomerAccountName(params.customerName);
  const customerDetailLines = [
    customerName,
    params.representativeName ? `Satınalma Departmanı: ${params.representativeName}` : '',
    params.address || params.shippingAddress || '',
    params.erpCustomerCode || '',
  ].filter(Boolean);

  const noteLines = [
    ...normalizeMetaFields(params.metaFields).map((field) => `${field.label}: ${field.value}`),
    ...(params.description ? [params.description] : []),
    ...(params.notes ?? []).filter((item) => item.trim().length > 0),
  ].slice(0, 5);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(52, 90, 153);
  doc.rect(0, 0, 210, 4, 'F');

  doc.setDrawColor(215, 221, 232);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 11, 86, 33, 2, 2, 'FD');
  doc.roundedRect(104, 11, 94, 33, 2, 2, 'FD');
  doc.roundedRect(12, 50, 86, 37, 2, 2, 'FD');
  doc.roundedRect(104, 50, 94, 37, 2, 2, 'FD');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 24, 19, 52, 17, undefined, 'FAST');
  } else {
    doc.setTextColor(52, 90, 153);
    doc.setFontSize(22);
    doc.text('WINDOFORM', 55, 28, { align: 'center' });
  }

  doc.setTextColor(52, 90, 153);
  doc.setFontSize(11);
  doc.text('FİYAT TEKLİFİ', 108, 19);

  const offerInfoLines = [
    ['Teklif No', params.offerNo ?? '-'],
    ['Tarih', formatDate(params.offerDate) || new Date().toLocaleDateString('tr-TR')],
    ['Teslim', formatDate(params.deliveryDate) || '-'],
  ];

  doc.setTextColor(58, 65, 83);
  doc.setFontSize(8.5);
  offerInfoLines.forEach(([label, value], index) => {
    const y = 27 + index * 7;
    doc.text(`${label}:`, 108, y);
    doc.text(String(value), 190, y, { align: 'right' });
  });

  doc.setTextColor(52, 90, 153);
  doc.setFontSize(10);
  doc.text(COMPANY_NAME, 16, 58);
  doc.setTextColor(90, 98, 116);
  doc.setFontSize(7.5);
  COMPANY_CONTACT_LINES.forEach((line, index) => {
    doc.text(line, 16, 65 + index * 5.2);
  });

  doc.setTextColor(180, 186, 196);
  doc.setFontSize(6.5);
  doc.text('MÜŞTERİ (CARİ)', 108, 58);
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(9.5);
  if (customerDetailLines.length > 0) {
    doc.text(customerDetailLines[0], 108, 64);
  }
  doc.setTextColor(90, 98, 116);
  doc.setFontSize(7.4);
  customerDetailLines.slice(1).forEach((line, index) => {
    doc.text(line, 108, 70 + index * 5.2, { maxWidth: 82 });
  });

  const tableRows = params.lines.map((line) => [
    '',
    line.productCode ?? '',
    buildDescription(line),
    `${line.quantity || 0}`,
    formatCurrency(line.unitPrice || 0, currency.code),
    buildDiscountSummary(line),
    formatCurrency(line.lineTotal || 0, currency.code),
  ]);

  autoTable(doc, {
    startY: 94,
    margin: { left: 12, right: 12 },
    head: [[
      'GÖRSEL',
      'STOK KODU',
      'STOK ADI / AÇIKLAMA',
      'MİKTAR',
      'BİRİM FİYAT',
      'İSKONTO',
      'NET TOPLAM',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: PDF_FONT_NAME,
      fontStyle: 'normal',
      fontSize: 7.5,
      lineColor: [220, 226, 236],
      lineWidth: 0.15,
      textColor: [46, 57, 77],
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: [52, 90, 153],
      textColor: [255, 255, 255],
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 67 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 0) {
        const x = data.cell.x + 2;
        const y = data.cell.y + 2;
        const size = Math.min(12, data.cell.height - 4);
        doc.setDrawColor(213, 219, 229);
        doc.rect(x, y, size, size);
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, x + 1, y + 1, size - 2, size - 2, undefined, 'FAST');
        } else {
          doc.setTextColor(120, 131, 149);
          doc.setFontSize(6);
          doc.text('WF', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
        }
      }
    },
  });

  const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  const summaryStartY = Math.max(finalY + 10, 160);

  doc.setDrawColor(199, 208, 220);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, summaryStartY, 72, 22, 2, 2, 'FD');
  doc.roundedRect(134, summaryStartY, 64, 32, 2, 2, 'FD');

  doc.setTextColor(123, 132, 148);
  doc.setFontSize(7);
  doc.text('MÜŞTERİ ONAYI', 16, summaryStartY + 6);
  doc.setDrawColor(210, 216, 226);
  doc.line(18, summaryStartY + 15, 76, summaryStartY + 15);
  doc.setFontSize(6.5);
  doc.text('Kaşe ve imza', 47, summaryStartY + 20, { align: 'center' });

  const summaryLines: Array<[string, number]> = [
    ['Brüt Toplam', totals.grossTotal],
    ['İskonto Toplam', totals.discountTotal],
    ['Net Ara Toplam', totals.netTotal],
    [`KDV (%${params.lines[0]?.vatRate ?? 20})`, totals.vatTotal],
  ];
  doc.setTextColor(123, 132, 148);
  doc.setFontSize(7.5);
  summaryLines.forEach(([label, value], index) => {
    const y = summaryStartY + 7 + index * 5.5;
    doc.text(label, 138, y);
    doc.text(formatCurrency(Number(value), currency.code), 194, y, { align: 'right' });
  });
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(11);
  doc.text('Genel Toplam:', 138, summaryStartY + 28);
  doc.text(formatCurrency(totals.grandTotal, currency.code), 194, summaryStartY + 28, { align: 'right' });

  const noteSectionY = summaryStartY + 42;
  doc.setFillColor(248, 250, 253);
  doc.rect(0, noteSectionY, 210, 38, 'F');
  doc.setDrawColor(52, 90, 153);
  doc.setLineWidth(0.6);
  doc.line(12, noteSectionY + 4, 12, noteSectionY + 34);
  doc.setLineWidth(0.2);
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(9);
  doc.text('TEKLİF ŞARTLARI VE ÖNEMLİ NOTLAR', 16, noteSectionY + 8);
  doc.setDrawColor(182, 191, 206);
  doc.roundedRect(16, noteSectionY + 12, 58, 8, 1.2, 1.2, 'S');
  doc.setFontSize(7);
  doc.setTextColor(80, 90, 110);
  doc.text(
    `TESLİM ŞEKLİ (DELIVERY TERMS): ${params.salesTypeName || 'Belirtilecektir'}`,
    18,
    noteSectionY + 17
  );

  const renderedTerms = noteLines.length > 0 ? noteLines : TERMS_LINES;
  renderedTerms.slice(0, 6).forEach((line, index) => {
    const isLeft = index < 3;
    const x = isLeft ? 16 : 109;
    const y = noteSectionY + 25 + (index % 3) * 5.4;
    doc.text(`• ${line}`, x, y, { maxWidth: isLeft ? 84 : 84 });
  });

  const referenceStartY = noteSectionY + 44;
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(9);
  doc.text('SAHA VE KEŞİF GÖRSELLERİ (REFERANS)', 16, referenceStartY);
  doc.setFontSize(6.8);
  doc.setTextColor(126, 134, 149);
  doc.text(
    'Bu görseller, teklifin montaj ve proje süreçlerine ait örnek başlıklardır. Referans niteliğiyle eklenmiştir.',
    16,
    referenceStartY + 5
  );

  const referenceBoxY = referenceStartY + 9;
  [16, 74, 132].forEach((x, index) => {
    doc.setDrawColor(196, 204, 216);
    doc.roundedRect(x, referenceBoxY, 46, 24, 1.5, 1.5, 'S');
    const imageData = referenceDataUrls[index] || logoDataUrl;
    if (imageData) {
      doc.addImage(imageData, x + 1.5, referenceBoxY + 1.5, 43, 17, undefined, 'FAST');
    }
    doc.setTextColor(90, 98, 116);
    doc.setFontSize(6.2);
    doc.text(`Referans ${index + 1}`, x + 23, referenceBoxY + 21.5, { align: 'center' });
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

  const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
  coverPages.forEach((page) => mergedPdf.addPage(page));

  const linePages = await mergedPdf.copyPages(linesPdf, linesPdf.getPageIndices());
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
