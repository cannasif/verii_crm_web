import type {
  PdfCanvasElement,
  PdfReportElement,
  PdfTableElement,
} from '../types/pdf-report-template.types';
import { createClientId } from '@/lib/create-client-id';

export const DEFAULT_ELEMENT_WIDTH = 200;
export const DEFAULT_ELEMENT_HEIGHT = 50;
export const DEFAULT_TABLE_WIDTH = 680;
export const DEFAULT_TABLE_HEIGHT = 220;

export type PdfCreatableElementType =
  | 'text'
  | 'field'
  | 'table'
  | 'image'
  | 'shape'
  | 'container'
  | 'note'
  | 'summary'
  | 'quotationTotals';

export interface CreatePdfElementParams {
  type: PdfCreatableElementType;
  section: 'header' | 'content' | 'footer';
  x: number;
  y: number;
  pageNumber: number;
  parentId?: string;
  fieldLabel?: string;
  fieldPath?: string;
  imageValue?: string;
  imagePath?: string;
  texts?: {
    doubleClickToEdit?: string;
  };
}

export function createPdfElement(
  params: CreatePdfElementParams
): PdfCanvasElement | null {
  const {
    type,
    section,
    x,
    y,
    pageNumber,
    parentId,
    fieldLabel,
    fieldPath,
    imageValue,
    imagePath,
    texts,
  } = params;

  const base = {
    section,
    x,
    y,
    parentId,
    pageNumbers: [pageNumber] as number[],
  };

  if (type === 'text') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'text',
      ...base,
      width: DEFAULT_ELEMENT_WIDTH,
      height: 60,
      text: texts?.doubleClickToEdit ?? 'Double-click to edit',
      fontSize: 14,
      fontFamily: 'Arial',
    };
    return element;
  }

  if (type === 'shape') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'shape',
      ...base,
      width: 220,
      height: 80,
      style: {
        background: '#ffffff',
        border: '1px solid #d7dde8',
        radius: 12,
      },
    };
    return element;
  }

  if (type === 'container') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'container',
      ...base,
      width: 260,
      height: 140,
      style: {
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        radius: 16,
        padding: 16,
      },
    };
    return element;
  }

  if (type === 'note') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'note',
      ...base,
      width: 260,
      height: 120,
      text: 'Notlar',
      value: 'Aciklama veya sart metni',
      fontSize: 13,
      fontFamily: 'Arial',
      style: {
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        radius: 12,
        padding: 14,
      },
    };
    return element;
  }

  if (type === 'summary') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'summary',
      ...base,
      width: 240,
      height: 150,
      text: 'Toplamlar',
      fontSize: 13,
      fontFamily: 'Arial',
      style: {
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        radius: 12,
        padding: 14,
      },
      summaryItems: [
        { label: 'Ara Toplam', path: 'SubTotal', format: 'currency' },
        { label: 'KDV', path: 'VatAmount', format: 'currency' },
        { label: 'Genel Toplam', path: 'GrandTotal', format: 'currency' },
      ],
    };
    return element;
  }

  if (type === 'quotationTotals') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'quotationTotals',
      ...base,
      width: 260,
      height: 176,
      text: 'Teklif Toplamlari',
      fontSize: 13,
      fontFamily: 'Arial',
      style: {
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        radius: 12,
        padding: 14,
      },
      quotationTotalsOptions: {
        layout: 'single',
        currencyMode: 'code',
        currencyPath: 'Currency',
        grossLabel: 'Brut Toplam',
        discountLabel: 'Iskonto',
        netLabel: 'Net Toplam',
        vatLabel: 'KDV',
        grandLabel: 'Genel Toplam',
        showGross: true,
        showDiscount: true,
        showVat: true,
        emphasizeGrandTotal: true,
        noteTitle: 'Aciklama',
        notePath: 'Description',
        showNote: false,
        hideEmptyNote: true,
      },
    };
    return element;
  }

  if (type === 'field') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'field',
      ...base,
      width: DEFAULT_ELEMENT_WIDTH,
      height: DEFAULT_ELEMENT_HEIGHT,
      value: fieldLabel ?? fieldPath ?? '',
      path: fieldPath ?? '',
    };
    return element;
  }

  if (type === 'table') {
    const element: PdfTableElement = {
      id: createClientId(),
      type: 'table',
      ...base,
      width: DEFAULT_TABLE_WIDTH,
      height: DEFAULT_TABLE_HEIGHT,
      columns: [],
    };
    return element;
  }

  if (type === 'image') {
    const element: PdfReportElement = {
      id: createClientId(),
      type: 'image',
      ...base,
      width: 120,
      height: 80,
      value: imageValue ?? '',
      path: imagePath,
    };
    return element;
  }

  return null;
}

export function resolveSectionFromY(
  y: number,
  headerHeight: number,
  footerTop: number
): 'header' | 'content' | 'footer' {
  if (y < headerHeight) return 'header';
  if (y >= footerTop) return 'footer';
  return 'content';
}
