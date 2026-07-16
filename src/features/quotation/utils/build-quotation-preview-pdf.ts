import type { jsPDF } from 'jspdf';
import { getLineUnitDiscountBreakdown } from '@/lib/line-discount-display';
import { getLineImageDataUrl } from '@/lib/line-image-data-url-cache';
import { formatCurrency } from './format-currency';
import {
  buildPreviewPdfLineDetailRows,
  buildPreviewPdfLineDiscountRows,
  buildPreviewPdfUnitPriceCellData,
  computePreviewPdfTableRowHeight,
  drawPreviewPdfDiscountCellContent,
  drawPreviewPdfUnitPriceCellContent,
  drawPreviewPdfProductCodeCellContent,
  drawPreviewPdfProductNameCellContent,
  drawPreviewPdfProductNameOnlyCellContent,
  previewPdfLineHasDiscount,
  type PreviewPdfFooterDetailRow,
  type PreviewPdfLineDetailLabels,
  type PreviewPdfLineDetailMaps,
  type PreviewPdfLineDiscountLabels,
  type PreviewPdfUnitPriceCellData,
} from './build-preview-pdf-footer-details';
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
  imagePath?: string | null;
  pendingImagePreviewUrl?: string | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  profilDefinitionId?: number | null;
  demirDefinitionId?: number | null;
  vidaDefinitionId?: number | null;
  vidaDefinitionName?: string | null;
  baskiDefinitionId?: number | null;
  baskiDefinitionName?: string | null;
  baskiAciklama?: string | null;
}

export interface QuotationPreviewPdfLabels {
  documentTitle: string;
  senderLabel: string;
  recipientLabel: string;
  metaDate: string;
  metaOfferNo: string;
  notSpecified: string;
  lineImage: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unitPriceNet: string;
  netUnitPriceColumn: string;
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
  footerDetails?: PreviewPdfFooterDetailRow[];
  lineDetailLabels?: PreviewPdfLineDetailLabels;
  lineDetailMaps?: PreviewPdfLineDetailMaps;
  lineDiscountLabels?: PreviewPdfLineDiscountLabels;
  showDiscount?: boolean;
  draft?: boolean;
  hideVat?: boolean;
}

const NAVY: [number, number, number] = [60, 22, 54];
const TEAL: [number, number, number] = [255, 140, 28];
const PINK: [number, number, number] = [229, 17, 125];
const GRAD_FROM: [number, number, number] = [229, 17, 125];
const GRAD_TO: [number, number, number] = [255, 172, 36];
const INK: [number, number, number] = [42, 27, 42];
const MUTED: [number, number, number] = [120, 102, 116];
const BORDER: [number, number, number] = [228, 214, 223];
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
  return previewPdfLineHasDiscount(line);
}

function formatQuantityCell(line: QuotationPreviewPdfLine): string {
  const unit = line.unit?.trim();
  const qty = String(line.quantity ?? '');
  return unit ? `${qty} ${unit}` : qty;
}

async function resolveLineImageDataUrl(line: QuotationPreviewPdfLine): Promise<string | null> {
  return getLineImageDataUrl(line.imagePath, line.pendingImagePreviewUrl);
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

function formatUnitPriceCell(line: QuotationPreviewPdfLine, currencyCode: string): string {
  const breakdown = getLineUnitDiscountBreakdown(
    line.unitPrice ?? 0,
    line.discountRate1 ?? 0,
    line.discountRate2 ?? 0,
    line.discountRate3 ?? 0,
  );
  const displayPrice = breakdown.hasDiscount ? breakdown.discountedUnitPrice : line.unitPrice;
  return formatCurrency(displayPrice, currencyCode);
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
  const chipMidY = y + 1.1;
  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(label.toUpperCase(), x, chipMidY, { baseline: 'middle' });
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(value, x + w, chipMidY, { align: 'right', baseline: 'middle' });
}

const HEADER_NAME_LINE_HEIGHT = 4.6;
const HEADER_NAME_MAX_LINES = 2;
const HEADER_META_ROW_HEIGHT = 4.5;
const HEADER_CARD_BOTTOM_PADDING = 4.5;

function measureHeaderNameLines(
  doc: jsPDF,
  bodyFont: string,
  name: string,
  maxWidth: number,
): string[] {
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(12);
  return (doc.splitTextToSize(name.trim() || '-', maxWidth) as string[]).slice(0, HEADER_NAME_MAX_LINES);
}

function drawHeaderNameLines(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  startY: number,
  lines: string[],
  maxWidth: number,
): void {
  doc.setFontSize(12);
  lines.forEach((line, index) => {
    drawStrongText(doc, bodyFont, line, x, startY + index * HEADER_NAME_LINE_HEIGHT, INK, 0.18, {
      maxWidth,
    });
  });
}

interface TablePageBounds {
  top: number;
  bottom: number;
}

function updateTablePageBounds(
  bounds: Map<number, TablePageBounds>,
  pageNumber: number,
  cellY: number,
  cellHeight: number,
): void {
  const top = cellY;
  const bottom = cellY + cellHeight;
  const existing = bounds.get(pageNumber);
  if (!existing) {
    bounds.set(pageNumber, { top, bottom });
    return;
  }
  existing.top = Math.min(existing.top, top);
  existing.bottom = Math.max(existing.bottom, bottom);
}

function drawTablePageOutlines(doc: jsPDF, bounds: Map<number, TablePageBounds>): void {
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  bounds.forEach((pageBounds, pageNumber) => {
    doc.setPage(pageNumber);
    const height = pageBounds.bottom - pageBounds.top;
    if (height <= 0) return;
    doc.roundedRect(M, pageBounds.top, CONTENT_W, height, 2, 2, 'S');
  });
}

function drawHeader(
  doc: jsPDF,
  bodyFont: string,
  params: BuildQuotationPreviewPdfParams,
  offerDateStr: string,
  offerNoDisplay: string,
): number {
  drawHorizontalGradient(doc, 0, 0, PAGE_W, 3.2, GRAD_FROM, GRAD_TO);

  const headerTitle = params.draft ? params.labels.draftWatermark : params.labels.documentTitle;
  doc.setFontSize(23);
  drawStrongText(doc, bodyFont, headerTitle, PAGE_W / 2, 18, NAVY, 0.5, {
    align: 'center',
  });

  drawHorizontalGradient(doc, PAGE_W / 2 - 18, 20.6, 36, 1.4, GRAD_FROM, GRAD_TO, 60);

  const cardY = 28;
  const gap = 6;
  const colW = (CONTENT_W - gap) / 2;
  const rightX = M + colW + gap;
  const nameMaxWidth = colW - 12;
  const nameStartY = cardY + 10;
  const branchName = params.branchName.trim() || params.labels.notSpecified;
  const customerName = params.customerName.trim() || params.labels.notSpecified;

  const leftNameLines = measureHeaderNameLines(doc, bodyFont, branchName, nameMaxWidth);
  const rightNameLines = measureHeaderNameLines(doc, bodyFont, customerName, nameMaxWidth);
  const nameBlockHeight =
    Math.max(leftNameLines.length, rightNameLines.length, 1) * HEADER_NAME_LINE_HEIGHT;
  const dividerY = nameStartY + nameBlockHeight + 1.8;
  const dateY = dividerY + 3.2;
  const offerNoY = dateY + 5;
  const cardH = Math.max(32, offerNoY + HEADER_META_ROW_HEIGHT + HEADER_CARD_BOTTOM_PADDING - cardY);

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
  drawStrongText(doc, bodyFont, params.labels.senderLabel.toUpperCase(), M + 6, cardY + 4, PINK, 0.12);

  drawHeaderNameLines(doc, bodyFont, M + 6, nameStartY, leftNameLines, nameMaxWidth);

  if (params.branchCode?.trim()) {
    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(params.branchCode.trim(), M + 6, nameStartY + nameBlockHeight + 1.2);
  }

  doc.setFontSize(7);
  drawStrongText(doc, bodyFont, params.labels.recipientLabel.toUpperCase(), rightX + 6, cardY + 4, TEAL, 0.12);

  drawHeaderNameLines(doc, bodyFont, rightX + 6, nameStartY, rightNameLines, nameMaxWidth);

  doc.setFillColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.rect(rightX + 6, dividerY, colW - 12, 0.3, 'F');

  drawInfoChip(doc, bodyFont, rightX + 6, dateY, colW - 12, params.labels.metaDate, offerDateStr);
  drawInfoChip(doc, bodyFont, rightX + 6, offerNoY, colW - 12, params.labels.metaOfferNo, offerNoDisplay);

  return cardY + cardH + 8;
}

function drawFooterDetailsPanel(
  doc: jsPDF,
  bodyFont: string,
  footerTop: number,
  cardH: number,
  rows: PreviewPdfFooterDetailRow[],
): void {
  const rightCardW = 88;
  const gap = 6;
  const leftCardW = CONTENT_W - rightCardW - gap;
  const leftCardX = M;
  const paddingX = 5;
  const paddingTop = 5;
  const maxTextWidth = leftCardW - paddingX * 2;
  const rowGap = 1.2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftCardX, footerTop, leftCardW, cardH, 2.5, 2.5, 'FD');

  let rowY = footerTop + paddingTop;
  rows.forEach((row) => {
    if (row.isSectionHeader) {
      doc.setFont(bodyFont, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      const headerLines = doc.splitTextToSize(row.label, maxTextWidth) as string[];
      headerLines.forEach((line) => {
        doc.text(line, leftCardX + paddingX, rowY);
        rowY += 4.2;
      });
      rowY += rowGap;
      return;
    }

    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const labelLine = `${row.label}:`;
    doc.text(labelLine, leftCardX + paddingX, rowY);

    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const valueLines = doc.splitTextToSize(row.value, maxTextWidth) as string[];
    valueLines.forEach((line, index) => {
      doc.text(line, leftCardX + paddingX, rowY + 3.8 + index * 3.6);
    });
    rowY += 3.8 + valueLines.length * 3.6 + rowGap;
  });
}

function estimateFooterDetailsPanelHeight(
  doc: jsPDF,
  bodyFont: string,
  rows: PreviewPdfFooterDetailRow[],
  leftCardW: number,
): number {
  const paddingX = 5;
  const paddingTop = 5;
  const paddingBottom = 5;
  const maxTextWidth = leftCardW - paddingX * 2;
  const rowGap = 1.2;
  let height = paddingTop + paddingBottom;

  doc.setFont(bodyFont, 'normal');
  rows.forEach((row) => {
    if (row.isSectionHeader) {
      doc.setFontSize(7.5);
      const headerLines = doc.splitTextToSize(row.label, maxTextWidth) as string[];
      height += headerLines.length * 4.2 + rowGap;
      return;
    }

    doc.setFontSize(8);
    const valueLines = doc.splitTextToSize(row.value, maxTextWidth) as string[];
    height += 3.8 + valueLines.length * 3.6 + rowGap;
  });

  return Math.max(height, 24);
}

function drawFooter(
  doc: jsPDF,
  bodyFont: string,
  startY: number,
  params: BuildQuotationPreviewPdfParams,
  totals: ReturnType<typeof computeDocumentTotals>,
): void {
  const detailRows: Array<[string, number, boolean]> = [];

  if (params.showDiscount === true) {
    detailRows.push([params.labels.grossTotal, totals.grossTotal, false]);
    detailRows.push([params.labels.netSubtotal, totals.netTotal, false]);
    if (totals.generalDiscountAmount > 0) {
      detailRows.push([params.labels.generalDiscount, totals.generalDiscountAmount, true]);
      detailRows.push([params.labels.netSubtotal, totals.discountedNetTotal, false]);
    }
  } else {
    detailRows.push([params.labels.grossTotal, totals.netTotal, false]);
    detailRows.push([params.labels.netSubtotal, totals.discountedNetTotal, false]);
  }

  if (!params.hideVat) {
    detailRows.push([params.labels.totalVat, totals.totalVat, false]);
  }

  const cardW = 88;
  const cardX = PAGE_W - M - cardW;
  const headerH = 8;
  const rowH = 5.6;
  const grandH = params.hideVat ? 0 : 12;
  const bottomGap = params.hideVat ? 4 : 3;
  const cardH = headerH + detailRows.length * rowH + 4 + grandH + bottomGap;

  const footerDetails = params.footerDetails ?? [];
  const rightCardW = 88;
  const gap = 6;
  const leftCardW = CONTENT_W - rightCardW - gap;
  const leftPanelHeight =
    footerDetails.length > 0
      ? estimateFooterDetailsPanelHeight(doc, bodyFont, footerDetails, leftCardW)
      : 0;
  const combinedFooterHeight = Math.max(cardH, leftPanelHeight);

  const pageBottom = doc.internal.pageSize.getHeight() - 16;
  let footerTop = startY + 8;
  if (footerTop + combinedFooterHeight > pageBottom) {
    doc.addPage();
    doc.setFont(bodyFont, 'normal');
    footerTop = 20;
  }

  if (footerDetails.length > 0) {
    drawFooterDetailsPanel(
      doc,
      bodyFont,
      footerTop,
      Math.max(cardH, leftPanelHeight),
      footerDetails,
    );
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
  if (!params.hideVat) {
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

  const positions: Array<{ x: number; y: number }> = [
    { x: pageW * 0.28, y: pageH * 0.26 },
    { x: pageW * 0.62, y: pageH * 0.38 },
    { x: pageW * 0.38, y: pageH * 0.56 },
    { x: pageW * 0.68, y: pageH * 0.72 },
    { x: pageW * 0.32, y: pageH * 0.84 },
  ];

  const drawAll = (opacitySupported: boolean): void => {
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(48);
    if (opacitySupported) {
      doc.setTextColor(229, 17, 125);
    } else {
      doc.setTextColor(232, 228, 236);
    }
    positions.forEach((position) => {
      doc.text(text, position.x, position.y, {
        align: 'center',
        baseline: 'middle',
        angle: 38,
      });
    });
  };

  if (hasGState) {
    const gstate = candidate as JsPdfGStateExtension;
    gstate.saveGraphicsState();
    gstate.setGState(new gstate.GState({ opacity: 0.08 }));
    drawAll(true);
    gstate.restoreGraphicsState();
    return;
  }

  drawAll(false);
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
  const anyLineDiscount = params.lines.some((line) => lineHasDiscount(line));
  const showDiscountMode = params.showDiscount === true;
  const showDiscountColumn = showDiscountMode && anyLineDiscount;
  const lineImageDataUrls = await Promise.all(params.lines.map((line) => resolveLineImageDataUrl(line)));
  const hasAnyLineImage = lineImageDataUrls.some(Boolean);
  const productCodeColumnIndex = hasAnyLineImage ? 1 : 0;
  const productNameColumnIndex = hasAnyLineImage ? 2 : 1;
  const unitPriceColumnLabel = showDiscountMode
    ? params.labels.netUnitPriceColumn
    : anyLineDiscount
      ? params.labels.unitPriceNet
      : params.labels.unitPrice;
  const unitPriceColumnIndex = hasAnyLineImage ? 4 : 3;
  const lineUnitPriceCells: PreviewPdfUnitPriceCellData[] = params.lines.map((line) => {
    if (!showDiscountMode) {
      return { originalFormatted: '', netFormatted: '', hasLineDiscount: false };
    }
    return buildPreviewPdfUnitPriceCellData(
      line,
      (amount) => formatCurrency(amount, params.currencyCode),
    );
  });
  const discountColumnWidth = 22;
  const hasLineDetailConfig = Boolean(params.lineDetailLabels && params.lineDetailMaps);
  const lineDetailBlocks: PreviewPdfFooterDetailRow[][] = params.lines.map((line) => {
    if (!hasLineDetailConfig || !params.lineDetailLabels || !params.lineDetailMaps) return [];
    return buildPreviewPdfLineDetailRows(line, params.lineDetailLabels, params.lineDetailMaps);
  });
  const lineDiscountBlocks: PreviewPdfFooterDetailRow[][] = params.lines.map((line) => {
    if (!showDiscountColumn || !params.lineDiscountLabels) return [];
    return buildPreviewPdfLineDiscountRows(line, params.lineDiscountLabels);
  });

  const fixedColumnsWidth = hasAnyLineImage
    ? 16 + 28 + 18 + 26 + (showDiscountColumn ? discountColumnWidth : 0) + 28
    : 32 + 18 + 28 + (showDiscountColumn ? discountColumnWidth : 0) + 30;
  const productCodeColWidth = hasAnyLineImage ? 28 : 32;
  const productNameColWidth = CONTENT_W - fixedColumnsWidth;
  const discountColumnIndex = showDiscountColumn
    ? (hasAnyLineImage ? 5 : 4)
    : -1;
  const tableRowHeights = params.lines.map((line, index) =>
    computePreviewPdfTableRowHeight(
      doc,
      bodyFont,
      line.productName?.trim() ?? '',
      line.productCode?.trim() ?? '',
      lineDetailBlocks[index] ?? [],
      productNameColWidth,
      productCodeColWidth,
      lineDiscountBlocks[index] ?? [],
      showDiscountColumn ? discountColumnWidth : 0,
      showDiscountMode ? (lineUnitPriceCells[index] ?? null) : null,
    ),
  );

  const tableStartY = drawHeader(doc, bodyFont, params, offerDateStr, offerNoDisplay);
  const tablePageBounds = new Map<number, TablePageBounds>();

  const dataHeadRow = [
    params.labels.productCode,
    params.labels.productName,
    params.labels.quantity,
    unitPriceColumnLabel,
    ...(showDiscountColumn ? [params.labels.lineDiscount] : []),
    params.labels.lineTotal,
  ];

  const headRow = hasAnyLineImage ? [params.labels.lineImage, ...dataHeadRow] : dataHeadRow;

  const bodyRows = params.lines.map((line) => {
    const row = [
      line.productCode ?? '',
      line.productName ?? '',
      formatQuantityCell(line),
      formatUnitPriceCell(line, params.currencyCode),
      ...(showDiscountColumn ? [''] : []),
      formatCurrency(line.lineTotal, params.currencyCode),
    ];
    return hasAnyLineImage ? ['', ...row] : row;
  });

  const resolveBodyRowLineIndex = (rowIndex: number, raw: unknown): number => {
    if (rowIndex >= 0 && rowIndex < params.lines.length) {
      return rowIndex;
    }
    return bodyRows.findIndex((bodyRow) => bodyRow === raw);
  };

  const priceColumnHalign = showDiscountMode ? 'center' : 'right';
  const totalColumnHalign = showDiscountMode ? 'center' : 'right';

  const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> =
    hasAnyLineImage
      ? {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 28, halign: 'left' },
          2: { halign: 'left' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 26, halign: priceColumnHalign },
          ...(showDiscountColumn
            ? {
                5: { cellWidth: discountColumnWidth, halign: 'center' },
                6: { cellWidth: 28, halign: totalColumnHalign },
              }
            : { 5: { cellWidth: 28, halign: totalColumnHalign } }),
        }
      : {
          0: { cellWidth: 32, halign: 'left' },
          1: { halign: 'left' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 28, halign: priceColumnHalign },
          ...(showDiscountColumn
            ? {
                4: { cellWidth: discountColumnWidth, halign: 'center' },
                5: { cellWidth: 30, halign: totalColumnHalign },
              }
            : { 4: { cellWidth: 30, halign: totalColumnHalign } }),
        };

  autoTable(doc, {
    startY: tableStartY,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    margin: { left: M, right: M },
    rowPageBreak: 'avoid',
    tableLineWidth: 0,
    styles: {
      font: bodyFont,
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      lineColor: BORDER,
      lineWidth: 0.25,
      textColor: INK,
      fillColor: 255,
      overflow: 'linebreak',
      valign: 'top',
      minCellHeight: hasAnyLineImage ? 16 : 0,
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
    didParseCell: (data) => {
      if (data.section === 'head' || data.section === 'body') {
        updateTablePageBounds(tablePageBounds, data.pageNumber, data.cell.y, data.cell.height);
      }

      if (data.section !== 'body') return;

      const lineIndex = resolveBodyRowLineIndex(data.row.index, data.row.raw);
      const rowHeight = lineIndex >= 0 ? (tableRowHeights[lineIndex] ?? 7.5) : 7.5;
      data.cell.styles.valign = 'top';
      data.cell.styles.minCellHeight = rowHeight;
      data.cell.styles.fillColor = 255;
      data.cell.styles.cellPadding = { top: 2.5, right: 3, bottom: 2.5, left: 3 };

      if (
        data.column.index === productCodeColumnIndex
        || data.column.index === productNameColumnIndex
        || (showDiscountMode
          && data.column.index === unitPriceColumnIndex
          && (lineUnitPriceCells[lineIndex]?.hasLineDiscount ?? false))
        || (showDiscountColumn && data.column.index === discountColumnIndex)
      ) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      if (data.row.index < 0) return;

      const lineIndex = resolveBodyRowLineIndex(data.row.index, data.row.raw);
      if (lineIndex < 0) return;

      if (hasAnyLineImage && data.column.index === 0) {
        const imageDataUrl = lineImageDataUrls[lineIndex];
        if (!imageDataUrl) return;

        const padding = 1.6;
        const size = Math.min(12, data.cell.width - padding * 2, data.cell.height - padding * 2);
        const x = data.cell.x + (data.cell.width - size) / 2;
        const y = data.cell.y + (data.cell.height - size) / 2;

        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(x - 0.4, y - 0.4, size + 0.8, size + 0.8, 0.8, 0.8, 'S');
        doc.addImage(imageDataUrl, getImageFormat(imageDataUrl), x, y, size, size, undefined, 'FAST');
        return;
      }

      const line = params.lines[lineIndex];
      if (!line) return;

      const detailRows = lineDetailBlocks[lineIndex] ?? [];

      if (data.column.index === productCodeColumnIndex) {
        drawPreviewPdfProductCodeCellContent(
          doc,
          bodyFont,
          data.cell.x,
          data.cell.y,
          data.cell.width,
          line.productCode ?? '',
        );
        return;
      }

      if (showDiscountColumn && data.column.index === discountColumnIndex) {
        drawPreviewPdfDiscountCellContent(
          doc,
          bodyFont,
          data.cell.x,
          data.cell.y,
          data.cell.width,
          lineDiscountBlocks[lineIndex] ?? [],
        );
        return;
      }

      if (
        showDiscountMode
        && data.column.index === unitPriceColumnIndex
        && (lineUnitPriceCells[lineIndex]?.hasLineDiscount ?? false)
      ) {
        drawPreviewPdfUnitPriceCellContent(
          doc,
          bodyFont,
          data.cell.x,
          data.cell.y,
          data.cell.width,
          lineUnitPriceCells[lineIndex]!,
        );
        return;
      }

      if (data.column.index !== productNameColumnIndex) return;

      if (detailRows.length > 0) {
        drawPreviewPdfProductNameCellContent(
          doc,
          bodyFont,
          data.cell.x,
          data.cell.y,
          data.cell.width,
          line.productName ?? '',
          detailRows,
        );
        return;
      }

      drawPreviewPdfProductNameOnlyCellContent(
        doc,
        bodyFont,
        data.cell.x,
        data.cell.y,
        data.cell.width,
        line.productName ?? '',
      );
    },
  });

  type DocWithTable = InstanceType<typeof JsPDF> & { lastAutoTable?: { finalY: number } };
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? tableStartY;

  drawTablePageOutlines(doc, tablePageBounds);
  doc.setPage(doc.getNumberOfPages());

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
