import type { jsPDF } from 'jspdf';
import type { TFunction } from 'i18next';
import { getLineUnitDiscountBreakdown } from '@/lib/line-discount-display';
import type { QuotationNotesDto } from '../types/quotation-types';
import { QUOTATION_NOTE_KEYS } from './quotation-payload-mapper';

const INK: [number, number, number] = [42, 27, 42];
const MUTED: [number, number, number] = [120, 102, 116];

export interface PreviewPdfFooterDetailRow {
  label: string;
  value: string;
  isSectionHeader?: boolean;
}

export interface PreviewPdfLineDetailInputLine {
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

export interface PreviewPdfLineDetailLabels {
  descriptionField1Label: string;
  descriptionField2Label: string;
  descriptionField3Label: string;
  windoProfileLabel: string;
  windoRebarLabel: string;
  windoScrewLabel: string;
  windoPrintLabel: string;
  windoPrintDescriptionLabel: string;
}

export interface PreviewPdfLineDetailMaps {
  profilMap: Record<number, string>;
  demirMap: Record<number, string>;
  vidaMap: Record<number, string>;
  baskiMap: Record<number, string>;
}

export interface PreviewPdfDocumentFooterLabels {
  koliBaskiLabel: string;
  paymentTypeLabel: string;
  notesLabel: string;
  structuredNoteLabel: string;
  shippingAddressLabel: string;
}

export interface PreviewPdfDocumentFooterInput {
  koliBaskiName?: string | null;
  paymentTypeName?: string | null;
  description?: string | null;
  quotationNotes?: QuotationNotesDto | null;
  shippingAddressText?: string | null;
}

export interface PreviewPdfLineDiscountLabels {
  discount1Label: string;
  discount2Label: string;
  discount3Label: string;
}

export interface PreviewPdfLineDiscountInput {
  discountRate1?: number;
  discountRate2?: number;
  discountRate3?: number;
}

export interface PreviewPdfLineUnitPriceInput {
  unitPrice: number;
  discountRate1?: number;
  discountRate2?: number;
  discountRate3?: number;
}

export interface PreviewPdfUnitPriceCellData {
  originalFormatted: string;
  netFormatted: string;
  hasLineDiscount: boolean;
}

export interface PreviewPdfShippingAddressSource {
  shippingAddressId?: number | null;
  shippingAddressText?: string | null;
  shippingAddresses?: Array<{ id: number; addressText: string }>;
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

function resolveDefinitionName(
  definitionId: number | null | undefined,
  definitionMap: Record<number, string>,
  explicitName?: string | null,
): string | null {
  if (hasText(explicitName)) return explicitName.trim();
  if (definitionId != null && definitionId > 0) {
    const mapped = definitionMap[definitionId]?.trim();
    return mapped || null;
  }
  return null;
}

function pushDetailRow(
  rows: PreviewPdfFooterDetailRow[],
  label: string,
  value: string | null | undefined,
): void {
  if (!hasText(value)) return;
  rows.push({ label, value: value.trim() });
}

function buildPreviewPdfStructuredNoteRows(
  notes: QuotationNotesDto | null | undefined,
  structuredNoteLabel: string,
): PreviewPdfFooterDetailRow[] {
  if (!notes) return [];

  const rows: PreviewPdfFooterDetailRow[] = [];
  QUOTATION_NOTE_KEYS.forEach((key, index) => {
    pushDetailRow(rows, `${structuredNoteLabel} ${index + 1}`, notes[key]);
  });
  return rows;
}

export function buildPreviewPdfLineDetailLabels(t: TFunction): PreviewPdfLineDetailLabels {
  return {
    descriptionField1Label: t('lines.descriptionField1Label'),
    descriptionField2Label: t('lines.descriptionField2Label'),
    descriptionField3Label: t('lines.descriptionField3Label'),
    windoProfileLabel: t('lines.windoProfileLabel'),
    windoRebarLabel: t('lines.windoRebarLabel'),
    windoScrewLabel: t('lines.windoScrewLabel'),
    windoPrintLabel: t('lines.windoPrintLabel', { defaultValue: 'Baskı' }),
    windoPrintDescriptionLabel: t('lines.windoPrintDescriptionLabel', { defaultValue: 'Baskı açıklaması' }),
  };
}

import type { DocumentNotesContext } from '../hooks/useDocumentNotesLabels';

export function buildPreviewPdfDocumentFooterLabels(
  t: TFunction,
  context: DocumentNotesContext = 'quotation',
): PreviewPdfDocumentFooterLabels {
  const noteNamespace = context;
  return {
    koliBaskiLabel: t('header.koliBaski'),
    paymentTypeLabel: t('header.paymentType'),
    notesLabel: t('header.notes', { defaultValue: t('header.documentDetail', { defaultValue: 'Genel Not' }) }),
    structuredNoteLabel: t(`${noteNamespace}:notes.noteLabel`, {
      defaultValue: t('quotation:notes.noteLabel', { defaultValue: 'Not' }),
    }),
    shippingAddressLabel: t('header.shippingAddress'),
  };
}

export function buildPreviewPdfLineDiscountLabels(t: TFunction): PreviewPdfLineDiscountLabels {
  return {
    discount1Label: t('lines.discountNumbered1', { defaultValue: '1. İndirim' }),
    discount2Label: t('lines.discountNumbered2', { defaultValue: '2. İndirim' }),
    discount3Label: t('lines.discountNumbered3', { defaultValue: '3. İndirim' }),
  };
}

function formatPreviewPdfDiscountRate(rate: number): string {
  return `%${rate}`;
}

export function buildPreviewPdfLineDiscountRows(
  line: PreviewPdfLineDiscountInput,
  labels: PreviewPdfLineDiscountLabels,
): PreviewPdfFooterDetailRow[] {
  const rows: PreviewPdfFooterDetailRow[] = [];

  if ((line.discountRate1 ?? 0) > 0) {
    pushDetailRow(rows, labels.discount1Label, formatPreviewPdfDiscountRate(line.discountRate1 ?? 0));
  }
  if ((line.discountRate2 ?? 0) > 0) {
    pushDetailRow(rows, labels.discount2Label, formatPreviewPdfDiscountRate(line.discountRate2 ?? 0));
  }
  if ((line.discountRate3 ?? 0) > 0) {
    pushDetailRow(rows, labels.discount3Label, formatPreviewPdfDiscountRate(line.discountRate3 ?? 0));
  }

  return rows;
}

export function previewPdfLineHasDiscount(line: PreviewPdfLineDiscountInput): boolean {
  return [line.discountRate1, line.discountRate2, line.discountRate3].some((rate) => (rate ?? 0) > 0);
}

export function previewPdfHasGeneralDiscount(
  generalDiscountRate?: number | null,
  generalDiscountAmount?: number | null,
): boolean {
  if (generalDiscountAmount != null && !Number.isNaN(generalDiscountAmount) && generalDiscountAmount > 0) {
    return true;
  }
  if (generalDiscountRate != null && !Number.isNaN(generalDiscountRate) && generalDiscountRate > 0) {
    return true;
  }
  return false;
}

export function buildPreviewPdfUnitPriceCellData(
  line: PreviewPdfLineUnitPriceInput,
  formatAmount: (amount: number) => string,
): PreviewPdfUnitPriceCellData {
  const breakdown = getLineUnitDiscountBreakdown(
    line.unitPrice ?? 0,
    line.discountRate1 ?? 0,
    line.discountRate2 ?? 0,
    line.discountRate3 ?? 0,
  );

  return {
    originalFormatted: formatAmount(line.unitPrice ?? 0),
    netFormatted: formatAmount(breakdown.discountedUnitPrice),
    hasLineDiscount: breakdown.hasDiscount,
  };
}

export function resolvePreviewPdfPaymentTypeName(
  paymentTypeId: number | null | undefined,
  paymentTypeName: string | null | undefined,
  paymentTypes: Array<{ id: number; name: string }>,
): string | null {
  if (hasText(paymentTypeName)) return paymentTypeName.trim();
  if (paymentTypeId != null && paymentTypeId > 0) {
    const matched = paymentTypes.find((paymentType) => paymentType.id === paymentTypeId);
    if (hasText(matched?.name)) {
      return matched.name.trim();
    }
  }
  return null;
}

export function resolvePreviewPdfShippingAddressText(
  source: PreviewPdfShippingAddressSource,
): string | null {
  const shippingAddressId = source.shippingAddressId;
  if (shippingAddressId != null && shippingAddressId > 0 && source.shippingAddresses) {
    const matched = source.shippingAddresses.find((address) => address.id === shippingAddressId);
    if (hasText(matched?.addressText)) {
      return matched.addressText.trim();
    }
  }
  if (hasText(source.shippingAddressText)) {
    return source.shippingAddressText.trim();
  }
  return null;
}

export function buildPreviewPdfLineDetailRows(
  line: PreviewPdfLineDetailInputLine,
  labels: PreviewPdfLineDetailLabels,
  maps: PreviewPdfLineDetailMaps,
): PreviewPdfFooterDetailRow[] {
  const rows: PreviewPdfFooterDetailRow[] = [];

  pushDetailRow(rows, labels.descriptionField1Label, line.description1);
  pushDetailRow(rows, labels.descriptionField2Label, line.description2);
  pushDetailRow(rows, labels.descriptionField3Label, line.description3);
  pushDetailRow(
    rows,
    labels.windoProfileLabel,
    resolveDefinitionName(line.profilDefinitionId, maps.profilMap),
  );
  pushDetailRow(
    rows,
    labels.windoRebarLabel,
    resolveDefinitionName(line.demirDefinitionId, maps.demirMap),
  );
  pushDetailRow(
    rows,
    labels.windoScrewLabel,
    resolveDefinitionName(line.vidaDefinitionId, maps.vidaMap, line.vidaDefinitionName),
  );
  pushDetailRow(
    rows,
    labels.windoPrintLabel,
    resolveDefinitionName(line.baskiDefinitionId, maps.baskiMap, line.baskiDefinitionName),
  );
  pushDetailRow(rows, labels.windoPrintDescriptionLabel, line.baskiAciklama);

  return rows;
}

const SHORT_DETAIL_VALUE_MAX_LENGTH = 16;
const SHORT_DETAIL_LINE_MAX_LENGTH = 34;
const DETAIL_ITEMS_PER_ROW = 3;
const DETAIL_ITEM_GAP = 2.5;
const CELL_PADDING = 2.5;
const NAME_FONT_SIZE = 8.8;
const NAME_LINE_HEIGHT = 3.4;
const DETAIL_FONT_SIZE = 6;
const DETAIL_LINE_HEIGHT = 2.6;
const DETAIL_LABEL_STROKE = 0.1;
const NAME_STROKE = 0.07;
const CODE_STROKE = 0.06;

const MIN_PRODUCT_CODE_FONT_SIZE = 5.4;
const PRODUCT_CODE_LINE_HEIGHT = 3.2;
const DISCOUNT_FONT_SIZE = 5.4;
const DISCOUNT_LINE_HEIGHT = 2.35;
const DISCOUNT_ROW_GAP = 0.15;
const UNIT_PRICE_FONT_SIZE = 6.2;
const UNIT_PRICE_STRIKE_LINE_HEIGHT = 2.8;
const UNIT_PRICE_NET_LINE_HEIGHT = 3.1;
const UNIT_PRICE_STRUCK: [number, number, number] = [150, 130, 145];
const UNIT_PRICE_INK: [number, number, number] = [42, 27, 42];

function resolveProductCodeFontSize(
  doc: jsPDF,
  bodyFont: string,
  productCode: string,
  maxTextWidth: number,
): number {
  const trimmedCode = productCode.trim();
  if (!trimmedCode) return NAME_FONT_SIZE;

  let fontSize = NAME_FONT_SIZE;
  doc.setFont(bodyFont, 'bold');

  while (fontSize > MIN_PRODUCT_CODE_FONT_SIZE) {
    doc.setFontSize(fontSize);
    if (doc.getTextWidth(trimmedCode) <= maxTextWidth) {
      return fontSize;
    }
    fontSize -= 0.35;
  }

  return MIN_PRODUCT_CODE_FONT_SIZE;
}

function formatPreviewPdfLineDetailItem(row: PreviewPdfFooterDetailRow): string {
  return `${row.label}: ${row.value}`;
}

export function isShortPreviewPdfLineDetailRow(row: PreviewPdfFooterDetailRow): boolean {
  return (
    row.value.length <= SHORT_DETAIL_VALUE_MAX_LENGTH
    && formatPreviewPdfLineDetailItem(row).length <= SHORT_DETAIL_LINE_MAX_LENGTH
  );
}

function drawStrongText(
  doc: jsPDF,
  bodyFont: string,
  text: string,
  x: number,
  y: number,
  color: [number, number, number],
  fontSize: number,
  strokeWidth: number,
  options?: { maxWidth?: number; align?: 'left' | 'center' | 'right' },
): void {
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(strokeWidth);
  doc.text(text, x, y, {
    maxWidth: options?.maxWidth,
    align: options?.align,
    renderingMode: 'fillThenStroke',
  });
}

export function groupPreviewPdfLineDetailRowGroups(
  rows: PreviewPdfFooterDetailRow[],
): PreviewPdfFooterDetailRow[][] {
  const groups: PreviewPdfFooterDetailRow[][] = [];
  let shortBuffer: PreviewPdfFooterDetailRow[] = [];

  const flushShortBuffer = (): void => {
    if (shortBuffer.length === 0) return;
    groups.push([...shortBuffer]);
    shortBuffer = [];
  };

  rows.forEach((row) => {
    if (isShortPreviewPdfLineDetailRow(row)) {
      shortBuffer.push(row);
      if (shortBuffer.length >= DETAIL_ITEMS_PER_ROW) {
        flushShortBuffer();
      }
      return;
    }

    flushShortBuffer();
    groups.push([row]);
  });

  flushShortBuffer();
  return groups;
}

function measureDetailGroupHeight(
  doc: jsPDF,
  bodyFont: string,
  group: PreviewPdfFooterDetailRow[],
  maxTextWidth: number,
): number {
  if (group.length === 1 && !isShortPreviewPdfLineDetailRow(group[0])) {
    const row = group[0];
    const label = `${row.label}:`;
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(DETAIL_FONT_SIZE);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont(bodyFont, 'normal');
    const valueLines = doc.splitTextToSize(` ${row.value}`, Math.max(maxTextWidth - labelWidth, 8)) as string[];
    return Math.max(DETAIL_LINE_HEIGHT, valueLines.length * DETAIL_LINE_HEIGHT);
  }

  return DETAIL_LINE_HEIGHT;
}

function drawDetailGroup(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  maxTextWidth: number,
  group: PreviewPdfFooterDetailRow[],
): number {
  if (group.length === 1 && !isShortPreviewPdfLineDetailRow(group[0])) {
    const row = group[0];
    const label = `${row.label}:`;
    drawStrongText(doc, bodyFont, label, x, y, MUTED, DETAIL_FONT_SIZE, DETAIL_LABEL_STROKE);
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(DETAIL_FONT_SIZE);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(DETAIL_FONT_SIZE);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const valueLines = doc.splitTextToSize(` ${row.value}`, Math.max(maxTextWidth - labelWidth, 8)) as string[];
    valueLines.forEach((line, index) => {
      doc.text(line, x + (index === 0 ? labelWidth : 0), y + index * DETAIL_LINE_HEIGHT);
    });
    return Math.max(DETAIL_LINE_HEIGHT, valueLines.length * DETAIL_LINE_HEIGHT);
  }

  let cursorX = x;
  group.forEach((row) => {
    const label = `${row.label}:`;
    drawStrongText(doc, bodyFont, label, cursorX, y, MUTED, DETAIL_FONT_SIZE, DETAIL_LABEL_STROKE);
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(DETAIL_FONT_SIZE);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont(bodyFont, 'normal');
    doc.setFontSize(DETAIL_FONT_SIZE);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const valueText = ` ${row.value}`;
    doc.text(valueText, cursorX + labelWidth, y);
    cursorX += labelWidth + doc.getTextWidth(valueText) + DETAIL_ITEM_GAP;
  });

  return DETAIL_LINE_HEIGHT;
}

function measurePreviewPdfDiscountRowHeight(
  doc: jsPDF,
  bodyFont: string,
  row: PreviewPdfFooterDetailRow,
  maxTextWidth: number,
): number {
  const text = `${row.label}: ${row.value}`;
  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(DISCOUNT_FONT_SIZE);
  const valueLines = doc.splitTextToSize(text, maxTextWidth) as string[];
  return Math.max(DISCOUNT_LINE_HEIGHT, valueLines.length * DISCOUNT_LINE_HEIGHT) + DISCOUNT_ROW_GAP;
}

function drawPreviewPdfDiscountRow(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  row: PreviewPdfFooterDetailRow,
  halign: 'left' | 'center',
): number {
  const label = `${row.label}:`;
  const valueText = ` ${row.value}`;

  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(DISCOUNT_FONT_SIZE);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(DISCOUNT_FONT_SIZE);
  const valueWidth = doc.getTextWidth(valueText);
  const lineWidth = labelWidth + valueWidth;
  const startX = halign === 'center'
    ? x + Math.max((width - lineWidth) / 2, CELL_PADDING)
    : x + CELL_PADDING;

  drawStrongText(doc, bodyFont, label, startX, y, MUTED, DISCOUNT_FONT_SIZE, DETAIL_LABEL_STROKE);
  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(DISCOUNT_FONT_SIZE);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(valueText, startX + labelWidth, y);
  return DISCOUNT_LINE_HEIGHT + DISCOUNT_ROW_GAP;
}

export function estimatePreviewPdfDiscountRowsHeight(
  doc: jsPDF,
  bodyFont: string,
  discountRows: PreviewPdfFooterDetailRow[],
  cellWidth: number,
): number {
  if (discountRows.length === 0) return 0;

  const maxTextWidth = Math.max(cellWidth - CELL_PADDING * 2, 8);
  let height = CELL_PADDING + 2;
  discountRows.forEach((row) => {
    height += measurePreviewPdfDiscountRowHeight(doc, bodyFont, row, maxTextWidth);
  });
  return height + 2.5;
}

export function estimatePreviewPdfUnitPriceCellHeight(
  cellData: PreviewPdfUnitPriceCellData,
): number {
  if (!cellData.hasLineDiscount) return 0;
  return CELL_PADDING + 2 + UNIT_PRICE_STRIKE_LINE_HEIGHT + 0.3 + UNIT_PRICE_NET_LINE_HEIGHT + 2.5;
}

export function drawPreviewPdfUnitPriceCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  cellData: PreviewPdfUnitPriceCellData,
): void {
  if (!cellData.hasLineDiscount) return;

  const centerX = x + width / 2;
  let cursorY = y + CELL_PADDING + 2;

  doc.setFont(bodyFont, 'normal');
  doc.setFontSize(UNIT_PRICE_FONT_SIZE);
  doc.setTextColor(UNIT_PRICE_STRUCK[0], UNIT_PRICE_STRUCK[1], UNIT_PRICE_STRUCK[2]);
  doc.text(cellData.originalFormatted, centerX, cursorY, { align: 'center' });
  const strikeWidth = doc.getTextWidth(cellData.originalFormatted);
  const strikeY = cursorY - 0.9;
  doc.setDrawColor(UNIT_PRICE_STRUCK[0], UNIT_PRICE_STRUCK[1], UNIT_PRICE_STRUCK[2]);
  doc.setLineWidth(0.22);
  doc.line(centerX - strikeWidth / 2, strikeY, centerX + strikeWidth / 2, strikeY);

  cursorY += UNIT_PRICE_STRIKE_LINE_HEIGHT + 0.3;

  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(UNIT_PRICE_FONT_SIZE + 0.5);
  doc.setTextColor(UNIT_PRICE_INK[0], UNIT_PRICE_INK[1], UNIT_PRICE_INK[2]);
  doc.text(cellData.netFormatted, centerX, cursorY, { align: 'center' });
}

export function computePreviewPdfTableRowHeight(
  doc: jsPDF,
  bodyFont: string,
  productName: string,
  productCode: string,
  detailRows: PreviewPdfFooterDetailRow[],
  productNameColWidth: number,
  productCodeColWidth: number,
  discountRows: PreviewPdfFooterDetailRow[] = [],
  discountColWidth = 0,
  unitPriceCellData: PreviewPdfUnitPriceCellData | null = null,
): number {
  const nameHeight =
    detailRows.length > 0
      ? estimatePreviewPdfLineDetailBlockHeight(
          doc,
          bodyFont,
          productName,
          detailRows,
          productNameColWidth,
        )
      : estimatePreviewPdfProductNameOnlyHeight(doc, bodyFont, productName, productNameColWidth);
  const codeHeight = estimatePreviewPdfProductCodeHeight(doc, bodyFont, productCode, productCodeColWidth);
  const discountHeight =
    discountRows.length > 0 && discountColWidth > 0
      ? estimatePreviewPdfDiscountRowsHeight(doc, bodyFont, discountRows, discountColWidth)
      : 0;
  const unitPriceHeight = unitPriceCellData?.hasLineDiscount
    ? estimatePreviewPdfUnitPriceCellHeight(unitPriceCellData)
    : 0;
  return Math.max(nameHeight, codeHeight, discountHeight, unitPriceHeight, 7.5);
}

export function estimatePreviewPdfLineDetailBlockHeight(
  doc: jsPDF,
  bodyFont: string,
  productName: string,
  detailRows: PreviewPdfFooterDetailRow[],
  cellWidth: number,
): number {
  const maxTextWidth = Math.max(cellWidth - CELL_PADDING * 2, 12);
  let height = 4.5;

  const trimmedName = productName.trim();
  if (trimmedName) {
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(NAME_FONT_SIZE);
    const nameLines = doc.splitTextToSize(trimmedName, maxTextWidth) as string[];
    height += nameLines.length * NAME_LINE_HEIGHT + 0.4;
  }

  const groups = groupPreviewPdfLineDetailRowGroups(detailRows);
  groups.forEach((group) => {
    height += measureDetailGroupHeight(doc, bodyFont, group, maxTextWidth);
  });

  return height + 2.5;
}

export function estimatePreviewPdfProductNameOnlyHeight(
  doc: jsPDF,
  bodyFont: string,
  productName: string,
  cellWidth: number,
): number {
  const maxTextWidth = Math.max(cellWidth - CELL_PADDING * 2, 12);
  const trimmedName = productName.trim();
  if (!trimmedName) return 7.5;

  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(NAME_FONT_SIZE);
  const nameLines = doc.splitTextToSize(trimmedName, maxTextWidth) as string[];
  return nameLines.length * NAME_LINE_HEIGHT + 7;
}

export function estimatePreviewPdfProductCodeHeight(
  _doc: jsPDF,
  _bodyFont: string,
  productCode: string,
  _cellWidth: number,
): number {
  const trimmedCode = productCode.trim();
  if (!trimmedCode) return 7.5;

  return PRODUCT_CODE_LINE_HEIGHT + 7;
}

export function drawPreviewPdfProductCodeCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  productCode: string,
): void {
  const trimmedCode = productCode.trim();
  if (!trimmedCode) return;

  const maxTextWidth = Math.max(width - CELL_PADDING * 2, 8);
  const fontSize = resolveProductCodeFontSize(doc, bodyFont, trimmedCode, maxTextWidth);
  drawStrongText(
    doc,
    bodyFont,
    trimmedCode,
    x + CELL_PADDING,
    y + CELL_PADDING + 2,
    INK,
    fontSize,
    CODE_STROKE,
  );
}

export function drawPreviewPdfProductNameCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  productName: string,
  detailRows: PreviewPdfFooterDetailRow[],
): void {
  const maxTextWidth = Math.max(width - CELL_PADDING * 2, 12);
  let cursorY = y + CELL_PADDING + 2;
  const trimmedName = productName.trim();

  if (trimmedName) {
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(NAME_FONT_SIZE);
    const nameLines = doc.splitTextToSize(trimmedName, maxTextWidth) as string[];
    nameLines.forEach((line, index) => {
      drawStrongText(
        doc,
        bodyFont,
        line,
        x + CELL_PADDING,
        cursorY + index * NAME_LINE_HEIGHT,
        INK,
        NAME_FONT_SIZE,
        NAME_STROKE,
      );
    });
    cursorY += nameLines.length * NAME_LINE_HEIGHT + 0.4;
  }

  const groups = groupPreviewPdfLineDetailRowGroups(detailRows);
  groups.forEach((group) => {
    const blockHeight = drawDetailGroup(doc, bodyFont, x + CELL_PADDING, cursorY, maxTextWidth, group);
    cursorY += blockHeight;
  });
}

export function drawPreviewPdfDiscountCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  discountRows: PreviewPdfFooterDetailRow[],
): void {
  if (discountRows.length === 0) return;

  let cursorY = y + CELL_PADDING + 2;
  discountRows.forEach((row) => {
    const blockHeight = drawPreviewPdfDiscountRow(doc, bodyFont, x, cursorY, width, row, 'center');
    cursorY += blockHeight;
  });
}

export function drawPreviewPdfDetailRowsCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  detailRows: PreviewPdfFooterDetailRow[],
): void {
  if (detailRows.length === 0) return;

  const maxTextWidth = Math.max(width - CELL_PADDING * 2, 12);
  let cursorY = y + CELL_PADDING + 2;
  const groups = groupPreviewPdfLineDetailRowGroups(detailRows);
  groups.forEach((group) => {
    const blockHeight = drawDetailGroup(doc, bodyFont, x + CELL_PADDING, cursorY, maxTextWidth, group);
    cursorY += blockHeight;
  });
}

export function drawPreviewPdfProductNameOnlyCellContent(
  doc: jsPDF,
  bodyFont: string,
  x: number,
  y: number,
  width: number,
  productName: string,
): void {
  const trimmedName = productName.trim();
  if (!trimmedName) return;

  const maxTextWidth = Math.max(width - CELL_PADDING * 2, 12);
  doc.setFont(bodyFont, 'bold');
  doc.setFontSize(NAME_FONT_SIZE);
  const nameLines = doc.splitTextToSize(trimmedName, maxTextWidth) as string[];
  nameLines.forEach((line, index) => {
    drawStrongText(
      doc,
      bodyFont,
      line,
      x + CELL_PADDING,
      y + CELL_PADDING + 2 + index * NAME_LINE_HEIGHT,
      INK,
      NAME_FONT_SIZE,
      NAME_STROKE,
    );
  });
}

export function buildPreviewPdfDocumentFooterDetails(
  input: PreviewPdfDocumentFooterInput,
  labels: PreviewPdfDocumentFooterLabels,
): PreviewPdfFooterDetailRow[] {
  const rows: PreviewPdfFooterDetailRow[] = [];

  pushDetailRow(rows, labels.koliBaskiLabel, input.koliBaskiName);
  pushDetailRow(rows, labels.paymentTypeLabel, input.paymentTypeName);
  pushDetailRow(rows, labels.notesLabel, input.description);
  buildPreviewPdfStructuredNoteRows(input.quotationNotes, labels.structuredNoteLabel).forEach((noteRow) => {
    rows.push(noteRow);
  });
  pushDetailRow(rows, labels.shippingAddressLabel, input.shippingAddressText);

  return rows;
}
