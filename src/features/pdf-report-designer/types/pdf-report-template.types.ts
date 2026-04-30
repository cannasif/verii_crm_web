export type PdfReportSection = 'page' | 'header' | 'content' | 'footer';

export interface PdfElementStyle {
  fontWeight?: number | string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  imageFit?: 'contain' | 'cover';
  background?: string;
  border?: string;
  radius?: number;
  padding?: number | string;
  opacity?: number;
}

export type PdfRuleOperator =
  | 'equals'
  | 'notEquals'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'greaterOrEqual'
  | 'lessThan'
  | 'lessOrEqual'
  | 'contains';

export interface PdfVisibilityRule {
  fieldPath?: string;
  operator?: PdfRuleOperator;
  value?: string;
}

export type PdfVisibilityLogic = 'all' | 'any';

export interface PdfConditionalStyleRule {
  fieldPath?: string;
  operator?: PdfRuleOperator;
  value?: string;
  color?: string;
  background?: string;
  border?: string;
  fontWeight?: number | string;
  opacity?: number;
}

export interface PdfSummaryItem {
  label: string;
  path: string;
  format?: 'text' | 'number' | 'currency' | 'date';
}

export interface PdfQuotationTotalsOptions {
  layout?: 'single' | 'two-column';
  currencyMode?: 'none' | 'code';
  currencyPath?: string;
  grossLabel?: string;
  discountLabel?: string;
  netLabel?: string;
  vatLabel?: string;
  grandLabel?: string;
  showGross?: boolean;
  showDiscount?: boolean;
  showVat?: boolean;
  emphasizeGrandTotal?: boolean;
  noteTitle?: string;
  notePath?: string;
  noteText?: string;
  showNote?: boolean;
  hideEmptyNote?: boolean;
}

export interface PdfReportElementBase {
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
  parentId?: string;
  summaryItems?: PdfSummaryItem[];
  quotationTotalsOptions?: PdfQuotationTotalsOptions;
  visibilityRule?: PdfVisibilityRule;
  visibilityRules?: PdfVisibilityRule[];
  visibilityLogic?: PdfVisibilityLogic;
  conditionalStyleRules?: PdfConditionalStyleRule[];
}

export interface PdfReportElement extends PdfReportElementBase {
  type: 'text' | 'field' | 'image' | 'shape' | 'container' | 'note' | 'summary' | 'quotationTotals';
}

export interface PdfTableColumn {
  label: string;
  path: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'date' | 'image';
  visibilityRule?: PdfVisibilityRule;
  visibilityRules?: PdfVisibilityRule[];
  visibilityLogic?: PdfVisibilityLogic;
}

export interface PdfTableStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
}

export interface PdfTableOptions {
  repeatHeader?: boolean;
  pageBreak?: 'auto' | 'avoid' | 'always';
  reportRegionMode?: 'flow';
  dense?: boolean;
  showBorders?: boolean;
  presetName?: string;
  groupByPath?: string;
  groupHeaderLabel?: string;
  showGroupFooter?: boolean;
  groupFooterLabel?: string;
  groupFooterValuePath?: string;
  detailColumnPath?: string;
  detailPaths?: string[];
  detailLineFontSize?: number;
  detailLineColor?: string;
  continuationElementIds?: string[];
  flowElementIds?: string[];
  repeatedElementIds?: string[];
  firstPageBudget?: number;
  continuationPageBudget?: number;
  lastPageBudget?: number;
}

export interface PdfTableElement extends PdfReportElementBase {
  type: 'table';
  columns: PdfTableColumn[];
  headerStyle?: PdfTableStyle;
  rowStyle?: PdfTableStyle;
  alternateRowStyle?: PdfTableStyle;
  columnWidths?: number[];
  tableOptions?: PdfTableOptions;
}

export type PdfCanvasElement = PdfReportElement | PdfTableElement;

export function isPdfTableElement(el: PdfCanvasElement): el is PdfTableElement {
  return el.type === 'table';
}

export function isPdfReportElement(el: PdfCanvasElement): el is PdfReportElement {
  return el.type !== 'table';
}
