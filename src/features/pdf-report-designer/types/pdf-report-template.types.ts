export type PdfReportSection = 'header' | 'content' | 'footer';

export interface PdfElementStyle {
  fontWeight?: number | string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  background?: string;
  border?: string;
  radius?: number;
  padding?: number | string;
  opacity?: number;
}

interface PdfReportElementBase {
  id: string;
  section: PdfReportSection;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  rotation?: number;
  locked?: boolean;
  hidden?: boolean;
  style?: PdfElementStyle;
  value?: string;
  text?: string;
  path?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  pageNumbers?: number[];
}

export interface PdfReportElement extends PdfReportElementBase {
  type: 'text' | 'field' | 'image';
}

export interface PdfTableColumn {
  label: string;
  path: string;
}

export interface PdfTableElement extends PdfReportElementBase {
  type: 'table';
  columns: PdfTableColumn[];
}

export type PdfCanvasElement = PdfReportElement | PdfTableElement;

export function isPdfTableElement(el: PdfCanvasElement): el is PdfTableElement {
  return el.type === 'table';
}

export function isPdfReportElement(el: PdfCanvasElement): el is PdfReportElement {
  return el.type !== 'table';
}
