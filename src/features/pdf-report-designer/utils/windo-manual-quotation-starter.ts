import type { PdfCanvasElement, PdfElementStyle } from '../types/pdf-report-template.types';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { createWindoCanvasStarter } from './windo-canvas-starter';

type CreateId = () => string;

function pageText(
  createId: CreateId,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize: number,
  color: string,
  style?: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'text',
    section: 'page',
    x,
    y,
    width,
    height,
    text,
    fontSize,
    color,
    fontFamily: 'Outfit',
    pageNumbers: [pageNumber],
    style,
  };
}

function pageShape(
  createId: CreateId,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  height: number,
  style: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'shape',
    section: 'page',
    x,
    y,
    width,
    height,
    pageNumbers: [pageNumber],
    style,
  };
}

function pageImage(
  createId: CreateId,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  height: number,
  style?: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'image',
    section: 'page',
    x,
    y,
    width,
    height,
    pageNumbers: [pageNumber],
    style,
  };
}

function assignPage(elements: PdfCanvasElement[], pageNumber: number): PdfCanvasElement[] {
  return elements.map((element) => ({
    ...element,
    pageNumbers: [pageNumber],
  }));
}

export function createWindoManualQuotationStarter(
  createId: CreateId,
  ruleType: PricingRuleType = PricingRuleType.Quotation
): PdfCanvasElement[] {
  const quotationPage = assignPage(createWindoCanvasStarter(createId, ruleType), 1);

  return [
    ...quotationPage,

    pageImage(createId, 2, 32, 32, 730, 1059, {
      imageFit: 'cover',
      radius: 18,
      border: '1px solid #d7dde8',
    }),
    pageText(createId, 2, 54, 56, 320, 30, 'HAKKIMIZDA / ABOUT US', 20, '#0f4c81', {
      fontWeight: 700,
      letterSpacing: 0.6,
    }),

    pageImage(createId, 3, 32, 32, 730, 1059, {
      imageFit: 'cover',
      radius: 18,
      border: '1px solid #d7dde8',
    }),
    pageText(createId, 3, 54, 56, 360, 30, 'URUN ZAMAN CIZELGESI / TIMELINE', 20, '#0f4c81', {
      fontWeight: 700,
      letterSpacing: 0.6,
    }),

    pageText(createId, 4, 54, 70, 420, 26, 'TEKLIF SARTLARI VE ONEMLI NOTLAR', 20, '#2f5ca8', {
      fontWeight: 700,
      letterSpacing: 0.3,
    }),
    pageShape(createId, 4, 48, 140, 4, 220, {
      background: '#2f5ca8',
      radius: 999,
    }),
    pageShape(createId, 4, 76, 116, 560, 88, {
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      radius: 12,
    }),
    pageText(createId, 4, 92, 144, 520, 22, 'TESLIM SEKLI / DELIVERY TERMS', 12, '#64748b', {
      fontWeight: 600,
    }),
    pageText(createId, 4, 92, 178, 520, 120, 'Notlarinizi, seri numarasini ve ozel maddeleri buraya metin veya alan olarak ekleyin.', 13, '#475569', {
      lineHeight: 1.45,
    }),

    pageText(createId, 4, 54, 430, 460, 26, 'SAHA VE KESIF GORSELLERI (REFERANS)', 20, '#2f5ca8', {
      fontWeight: 700,
      letterSpacing: 0.3,
    }),
    pageText(createId, 4, 54, 466, 580, 22, 'Montaj, saha veya referans gorsellerinizi asagidaki alanlara tek tek yukleyebilirsiniz.', 12, '#64748b', {
      lineHeight: 1.4,
    }),

    pageImage(createId, 4, 54, 536, 200, 140, {
      imageFit: 'cover',
      radius: 12,
      border: '1px solid #cbd5e1',
    }),
    pageImage(createId, 4, 292, 536, 200, 140, {
      imageFit: 'cover',
      radius: 12,
      border: '1px solid #cbd5e1',
    }),
    pageImage(createId, 4, 530, 536, 200, 140, {
      imageFit: 'cover',
      radius: 12,
      border: '1px solid #cbd5e1',
    }),
    pageText(createId, 4, 104, 688, 100, 20, 'Referans 1', 12, '#64748b'),
    pageText(createId, 4, 342, 688, 100, 20, 'Referans 2', 12, '#64748b'),
    pageText(createId, 4, 580, 688, 100, 20, 'Referans 3', 12, '#64748b'),
  ];
}
