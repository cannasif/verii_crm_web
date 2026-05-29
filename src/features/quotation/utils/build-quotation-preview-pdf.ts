import type { jsPDF } from 'jspdf';
import { formatCurrency } from './format-currency';
import {
  QUOTATION_EXPORT_PDF_FONT,
  registerQuotationExportPdfFont,
} from './quotation-export-pdf-font';

export interface QuotationPreviewPdfLine {
  productCode?: string | null;
  productName: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1?: number;
  discountRate2?: number;
  discountRate3?: number;
  discountAmount1?: number;
  discountAmount2?: number;
  discountAmount3?: number;
  vatRate: number;
  vatAmount?: number;
  lineTotal: number;
  lineGrandTotal?: number;
}

export interface QuotationPreviewPdfLabels {
  documentTitle: string;
  senderLabel: string;
  recipientLabel: string;
  metaDate: string;
  metaOfferNo: string;
  notSpecified: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unitPriceNet: string;
  lineDiscount: string;
  vatRate: string;
  lineTotal: string;
  priceDetail: string;
  grossTotal: string;
  lineDiscountTotal: string;
  generalDiscount: string;
  netSubtotal: string;
  totalVat: string;
  grandTotalWithVat: string;
  validityNote: string;
  draftWatermark: string;
}

export interface BuildQuotationPreviewPdfParams {
  lines: QuotationPreviewPdfLine[];
  currencyCode: string;
  locale: string;
  offerDate?: string | null;
  offerNo?: string | null;
  customerName: string;
  branchName: string;
  branchCode?: string | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  labels: QuotationPreviewPdfLabels;
  draft?: boolean;
}

const NAVY: [number, number, number] = [60, 22, 54];
const TEAL: [number, number, number] = [255, 140, 28];
const PINK: [number, number, number] = [229, 17, 125];
const GRAD_FROM: [number, number, number] = [229, 17, 125];
const GRAD_TO: [number, number, number] = [255, 172, 36];
const INK: [number, number, number] = [42, 27, 42];
const MUTED: [number, number, number] = [120, 102, 116];
const BORDER: [number, number, number] = [228, 214, 223];
const ROW_ALT: [number, number, number] = [252, 247, 250];
const PANEL_HEAD: [number, number, number] = [252, 235, 242];
const HEAD_GUIDE: [number, number, number] = [150, 110, 138];

const M = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - M * 2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDateLabel(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value?.trim()) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString(locale);
}

function lineHasDiscount(line: QuotationPreviewPdfLine): boolean {
  const rates = [line.discountRate1, line.discountRate2, line.discountRate3];
  const amounts = [line.discountAmount1, line.discountAmount2, line.discountAmount3];
  return rates.some((rate) => (rate ?? 0) > 0) || amounts.some((amount) => (amount ?? 0) > 0);
}

function formatQuantityCell(line: QuotationPreviewPdfLine): string {
  const unit = line.unit?.trim();
  const qty = String(line.quantity ?? '');
  return unit ? `${qty} ${unit}` : qty;
}

function formatLineDiscountSummary(
  line: QuotationPreviewPdfLine,
  discountLabel: string,
): string {
  const rates = [line.discountRate1, line.discountRate2, line.discountRate3];
  const lines: string[] = [];
  rates.forEach((rate, index) => {
    if ((rate ?? 0) > 0) {
      lines.push(`${discountLabel} ${index + 1}: %${rate}`);
    }
  });
  if (lines.length === 0) {
    return '—';
  }
  return lines.join('\n');
}

function formatUnitPriceCell(line: QuotationPreviewPdfLine, currencyCode: string): string {
  return formatCurrency(line.unitPrice, currencyCode);
}

function computeDocumentTotals(
  lines: QuotationPreviewPdfLine[],
  generalDiscountRate?: number | null,
  generalDiscountAmount?: number | null,
): {
  grossTotal: number;
  lineDiscountTotal: number;
  netTotal: number;
  generalDiscountAmount: number;
  discountedNetTotal: number;
  totalVat: number;
  grandTotal: number;
} {
  const grossTotal = round2(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const lineDiscountTotal = round2(
    lines.reduce(
      (sum, line) =>
        sum + (line.discountAmount1 ?? 0) + (line.discountAmount2 ?? 0) + (line.discountAmount3 ?? 0),
      0,
    ),
  );
  const netTotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const totalVat = round2(lines.reduce((sum, line) => sum + (line.vatAmount ?? 0), 0));

  let generalDiscount = 0;
  if (generalDiscountAmount != null && !Number.isNaN(generalDiscountAmount)) {
    generalDiscount = round2(Math.min(Math.max(0, generalDiscountAmount), netTotal));
  } else if (generalDiscountRate != null && !Number.isNaN(generalDiscountRate)) {
    const rate = Math.min(100, Math.max(0, generalDiscountRate));
    generalDiscount = round2(Math.min(netTotal * (rate / 100), netTotal));
  }

  const discountedNetTotal = round2(Math.max(netTotal - generalDiscount, 0));
  const totalVatAfterDiscount =
    netTotal > 0 ? round2(totalVat * (discountedNetTotal / netTotal)) : 0;
  const grandTotalAfterDiscount = round2(discountedNetTotal + totalVatAfterDiscount);

  return {
    grossTotal,
    lineDiscountTotal,
    netTotal,
    generalDiscountAmount: generalDiscount,
    discountedNetTotal,
    totalVat: totalVatAfterDiscount,
    grandTotal: grandTotalAfterDiscount,
  };
}

function drawHorizontalGradient(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  from: [number, number, number],
  to: [number, number, number],
  steps = 140,
): void {
  const slice = w / steps;
  for (let i = 0; i < steps; i += 1) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * slice, y, slice + 0.5, h, 'F');
  }
}

function drawStrongText(
  doc: jsPDF,
  bodyFont: string,
  text: string,
  x: number,
  y: number,
  color: [number, number, number],
  strokeWidth: number,
  options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number },
): void {
  doc.setFont(bodyFont, 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(strokeWidth);
  doc.text(text, x, y, {
    align: options?.align,
    maxWidth: options?.maxWidth,
    renderingMode: 'fillThenStroke',
  });
}

function drawInfoChip(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
): void {
  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(value, x + w, y, { align: 'right' });
}

function drawHeader(
  doc: jsPDF,
  bodyFont: string,
  params: BuildQuotationPreviewPdfParams,
  offerDateStr: string,
  offerNoDisplay: string,
): number {
  drawHorizontalGradient(doc, 0, 0, PAGE_W, 3.2, GRAD_FROM, GRAD_TO);

  doc.setFontSize(23);
  drawStrongText(doc, bodyFont, params.labels.documentTitle, PAGE_W / 2, 18, NAVY, 0.5, {
    align: 'center',
  });

  drawHorizontalGradient(doc, PAGE_W / 2 - 18, 20.6, 36, 1.4, GRAD_FROM, GRAD_TO, 60);

  const cardY = 28;
  const cardH = 32;
  const gap = 6;
  const colW = (CONTENT_W - gap) / 2;
  const rightX = M + colW + gap;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, cardY, colW, cardH, 2.5, 2.5, 'FD');
  doc.roundedRect(rightX, cardY, colW, cardH, 2.5, 2.5, 'FD');

  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(M, cardY, 2.2, cardH, 'F');
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.rect(rightX, cardY, 2.2, cardH, 'F');

  doc.setFontSize(7);
  drawStrongText(doc, bodyFont, params.labels.senderLabel.toUpperCase(), M + 6, cardY + 8, PINK, 0.12);

  doc.setFontSize(12);
  drawStrongText(
    doc,
    bodyFont,
    params.branchName.trim() || params.labels.notSpecified,
    M + 6,
    cardY + 16,
    INK,
    0.18,
    { maxWidth: colW - 12 },
  );

  if (params.branchCode?.trim()) {
    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(params.branchCode.trim(), M + 6, cardY + 23);
  }

  doc.setFontSize(7);
  drawStrongText(doc, bodyFont, params.labels.recipientLabel.toUpperCase(), rightX + 6, cardY + 8, TEAL, 0.12);

  doc.setFontSize(12);
  drawStrongText(
    doc,
    bodyFont,
    params.customerName.trim() || params.labels.notSpecified,
    rightX + 6,
    cardY + 16,
    INK,
    0.18,
    { maxWidth: colW - 12 },
  );

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(rightX + 6, cardY + 20, rightX + colW - 6, cardY + 20);

  drawInfoChip(doc, bodyFont, rightX + 6, cardY + 25, colW - 12, params.labels.metaDate, offerDateStr);
  drawInfoChip(doc, bodyFont, rightX + 6, cardY + 30, colW - 12, params.labels.metaOfferNo, offerNoDisplay);

  return cardY + cardH + 8;
}

function drawFooter(
  doc: jsPDF,
  bodyFont: string,
  startY: number,
  params: BuildQuotationPreviewPdfParams,
  totals: ReturnType<typeof computeDocumentTotals>,
): void {
  const detailRows: Array<[string, number, boolean]> = [
    [params.labels.grossTotal, totals.grossTotal, false],
  ];
  if (totals.lineDiscountTotal > 0) {
    detailRows.push([params.labels.lineDiscountTotal, totals.lineDiscountTotal, true]);
  }
  if (totals.generalDiscountAmount > 0) {
    detailRows.push([params.labels.generalDiscount, totals.generalDiscountAmount, true]);
  }
  detailRows.push(
    [params.labels.netSubtotal, totals.discountedNetTotal, false],
    [params.labels.totalVat, totals.totalVat, false],
  );

  const cardW = 88;
  const cardX = PAGE_W - M - cardW;
  const headerH = 8;
  const rowH = 5.6;
  const grandH = 12;
  const cardH = headerH + detailRows.length * rowH + 4 + grandH + 3;

  const pageBottom = doc.internal.pageSize.getHeight() - 16;
  let footerTop = startY + 8;
  if (footerTop + cardH > pageBottom) {
    doc.addPage();
    doc.setFont(bodyFont, 'normal');
    footerTop = 20;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, footerTop, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFillColor(PANEL_HEAD[0], PANEL_HEAD[1], PANEL_HEAD[2]);
  doc.roundedRect(cardX, footerTop, cardW, headerH, 2.5, 2.5, 'F');
  doc.rect(cardX, footerTop + headerH - 3, cardW, 3, 'F');
  doc.setFontSize(8);
  drawStrongText(doc, bodyFont, params.labels.priceDetail.toUpperCase(), cardX + 5, footerTop + 5.3, NAVY, 0.12);

  let rowY = footerTop + headerH + 4;
  doc.setFontSize(8.2);
  detailRows.forEach(([label, value, isDiscount]) => {
    doc.setFont(bodyFont, 'normal');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(label, cardX + 5, rowY);
    doc.setFont(bodyFont, 'bold');
    if (isDiscount && value > 0) {
      doc.setTextColor(PINK[0], PINK[1], PINK[2]);
      doc.text(`-${formatCurrency(value, params.currencyCode)}`, cardX + cardW - 5, rowY, {
        align: 'right',
      });
    } else {
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(formatCurrency(value, params.currencyCode), cardX + cardW - 5, rowY, {
        align: 'right',
      });
    }
    rowY += rowH;
  });

  const grandY = rowY + 1;
  const grandMidY = grandY + grandH / 2;
  drawHorizontalGradient(doc, cardX + 3, grandY, cardW - 6, grandH, GRAD_FROM, GRAD_TO);
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(params.labels.grandTotalWithVat.toUpperCase(), cardX + 7, grandMidY, {
    baseline: 'middle',
  });
  doc.setFontSize(12.5);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.18);
  doc.text(formatCurrency(totals.grandTotal, params.currencyCode), cardX + cardW - 7, grandMidY, {
    align: 'right',
    baseline: 'middle',
    renderingMode: 'fillThenStroke',
  });
}

type JsPdfGStateExtension = {
  GState: new (options: { opacity: number }) => unknown;
  setGState: (state: unknown) => void;
  saveGraphicsState: () => void;
  restoreGraphicsState: () => void;
};

function drawDraftWatermark(doc: jsPDF, bodyFont: string, text: string): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const candidate = doc as unknown as Partial<JsPdfGStateExtension>;
  const hasGState =
    typeof candidate.GState === 'function' &&
    typeof candidate.setGState === 'function' &&
    typeof candidate.saveGraphicsState === 'function' &&
    typeof candidate.restoreGraphicsState === 'function';

  const centerX = pageW / 2;
  const centerY = pageH * 0.46;

  if (hasGState) {
    const gstate = candidate as JsPdfGStateExtension;
    gstate.saveGraphicsState();
    gstate.setGState(new gstate.GState({ opacity: 0.05 }));
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(104);
    doc.setTextColor(229, 17, 125);
    doc.text(text, centerX, centerY, { align: 'center', baseline: 'middle', angle: 45 });
    gstate.restoreGraphicsState();
    return;
  }

  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(104);
  doc.setTextColor(240, 241, 247);
  doc.text(text, centerX, centerY, { align: 'center', baseline: 'middle', angle: 45 });
}

export async function buildQuotationPreviewPdfBlob(
  params: BuildQuotationPreviewPdfParams,
): Promise<Blob> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const hasUtf8Font = await registerQuotationExportPdfFont(doc);
  const bodyFont = hasUtf8Font ? QUOTATION_EXPORT_PDF_FONT : 'helvetica';

  const offerDateStr = formatDateLabel(params.offerDate, params.locale, params.labels.notSpecified);
  const offerNoDisplay = params.offerNo?.trim() || params.labels.notSpecified;
  const showDiscountColumn = params.lines.some((line) => lineHasDiscount(line));

  const tableStartY = drawHeader(doc, bodyFont, params, offerDateStr, offerNoDisplay);

  const headRow = [
    params.labels.productCode,
    params.labels.productName,
    params.labels.quantity,
    params.labels.unitPrice,
  ];
  if (showDiscountColumn) {
    headRow.push(params.labels.lineDiscount);
  }
  headRow.push(params.labels.vatRate, params.labels.lineTotal);

  const bodyRows = params.lines.map((line) => {
    const row = [
      line.productCode ?? '',
      line.productName ?? '',
      formatQuantityCell(line),
      formatUnitPriceCell(line, params.currencyCode),
    ];
    if (showDiscountColumn) {
      row.push(formatLineDiscountSummary(line, params.labels.lineDiscount));
    }
    row.push(`%${line.vatRate ?? 0}`, formatCurrency(line.lineTotal, params.currencyCode));
    return row;
  });

  const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> =
    {
      0: { cellWidth: 30, halign: 'left' },
      1: { halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
    };

  let colIndex = 4;
  if (showDiscountColumn) {
    columnStyles[colIndex] = { cellWidth: 30, halign: 'left' };
    colIndex += 1;
  }
  columnStyles[colIndex] = { cellWidth: 16, halign: 'center' };
  columnStyles[colIndex + 1] = { cellWidth: 26, halign: 'right' };

  autoTable(doc, {
    startY: tableStartY,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    margin: { left: M, right: M },
    tableLineWidth: 0,
    styles: {
      font: bodyFont,
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: { top: 3.4, right: 3, bottom: 3.4, left: 3 },
      lineColor: BORDER,
      lineWidth: 0.25,
      textColor: INK,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      font: bodyFont,
      fontStyle: 'bold',
      fillColor: NAVY,
      textColor: 255,
      halign: 'center',
      valign: 'middle',
      fontSize: 7.5,
      lineColor: HEAD_GUIDE,
      lineWidth: 0.3,
      cellPadding: { top: 3.5, right: 2, bottom: 3.5, left: 2 },
    },
    columnStyles,
    alternateRowStyles: { fillColor: ROW_ALT },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const raw = Array.isArray(data.cell.text) ? data.cell.text.join('') : String(data.cell.text);
        if (raw.length > 22) {
          data.cell.styles.fontSize = 6;
        } else if (raw.length > 16) {
          data.cell.styles.fontSize = 6.8;
        }
      }
    },
  });

  type DocWithTable = InstanceType<typeof JsPDF> & { lastAutoTable?: { finalY: number } };
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? tableStartY;

  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, tableStartY, CONTENT_W, finalY - tableStartY, 2, 2, 'S');

  const totals = computeDocumentTotals(
    params.lines,
    params.generalDiscountRate,
    params.generalDiscountAmount,
  );

  drawFooter(doc, bodyFont, finalY, params, totals);

  if (params.draft) {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      drawDraftWatermark(doc, bodyFont, params.labels.draftWatermark);
    }
  }

  return doc.output('blob') as Blob;
}
