export const DocumentRuleType = {
  Demand: 0,
  Quotation: 1,
  Order: 2,
  FastQuotation: 3,
  Activity: 4,
} as const;

export type DocumentRuleType = (typeof DocumentRuleType)[keyof typeof DocumentRuleType];

export const TemplateDesignerRuleType = {
  Demand: 1,
  Quotation: 2,
  Order: 3,
  FastQuotation: 4,
  Activity: 5,
} as const;

export type TemplateDesignerRuleType =
  (typeof TemplateDesignerRuleType)[keyof typeof TemplateDesignerRuleType];

export interface FieldDefinitionDto {
  label: string;
  path: string;
  type?: string;
  dataType?: string;
  description?: string;
  exampleValue?: string;
}

export interface ReportTemplateFieldsDto {
  headerFields: FieldDefinitionDto[];
  lineFields: FieldDefinitionDto[];
  exchangeRateFields?: FieldDefinitionDto[];
}

export interface ReportTemplatePageDto {
  width: number;
  height: number;
  unit: string;
  pageCount?: number;
}

export interface PdfReportElementStyleDto {
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

export interface PdfVisibilityRuleDto {
  fieldPath?: string;
  operator?:
    | 'equals'
    | 'notEquals'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'greaterThan'
    | 'greaterOrEqual'
    | 'lessThan'
    | 'lessOrEqual'
    | 'contains';
  value?: string;
}
export type PdfVisibilityLogicDto = 'all' | 'any';

export interface PdfConditionalStyleRuleDto {
  fieldPath?: string;
  operator?:
    | 'equals'
    | 'notEquals'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'greaterThan'
    | 'greaterOrEqual'
    | 'lessThan'
    | 'lessOrEqual'
    | 'contains';
  value?: string;
  color?: string;
  background?: string;
  border?: string;
  fontWeight?: number | string;
  opacity?: number;
}

export interface PdfSummaryItemDto {
  label: string;
  path: string;
  format?: 'text' | 'number' | 'currency' | 'date';
}

export interface PdfQuotationTotalsOptionsDto {
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

export interface ReportTemplateElementDto {
  id: string;
  type: string;
  section: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  value?: string;
  path?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  columns?: {
    label: string;
    path: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: 'text' | 'number' | 'currency' | 'date' | 'image';
    visibilityRule?: PdfVisibilityRuleDto;
    visibilityRules?: PdfVisibilityRuleDto[];
    visibilityLogic?: PdfVisibilityLogicDto;
  }[];
  headerStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
  };
  rowStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
  };
  alternateRowStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
  };
  columnWidths?: number[];
  tableOptions?: {
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
  };
  zIndex?: number;
  rotation?: number;
  locked?: boolean;
  hidden?: boolean;
  style?: PdfReportElementStyleDto;
  pageNumbers?: number[];
  parentId?: string;
  summaryItems?: PdfSummaryItemDto[];
  quotationTotalsOptions?: PdfQuotationTotalsOptionsDto;
  visibilityRule?: PdfVisibilityRuleDto;
  visibilityRules?: PdfVisibilityRuleDto[];
  visibilityLogic?: PdfVisibilityLogicDto;
  conditionalStyleRules?: PdfConditionalStyleRuleDto[];
}

export interface ReportTemplateDataDto {
  schemaVersion: number;
  layoutKey?: string;
  layoutOptions?: Record<string, string>;
  page: ReportTemplatePageDto;
  elements: ReportTemplateElementDto[];
}

export interface ReportTemplateGetDto {
  id: number;
  ruleType: DocumentRuleType;
  title: string;
  templateData: ReportTemplateDataDto;
  isActive: boolean;
  default?: boolean;
}

export interface ReportTemplateListItemDto {
  id: number;
  ruleType: DocumentRuleType;
  title: string;
  isActive: boolean;
  default?: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface ReportTemplateCreateDto {
  ruleType: DocumentRuleType;
  title: string;
  templateData: ReportTemplateDataDto;
  isActive: boolean;
  default?: boolean;
}

export type ReportTemplateUpdateDto = ReportTemplateCreateDto;

export interface PdfReportTemplateListParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  ruleType?: DocumentRuleType;
  isActive?: boolean;
}

export interface PdfReportTemplateListResult {
  items: ReportTemplateListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PdfTablePresetDto {
  id: number;
  ruleType: DocumentRuleType;
  name: string;
  key: string;
  columns: NonNullable<ReportTemplateElementDto['columns']>;
  tableOptions?: NonNullable<ReportTemplateElementDto['tableOptions']>;
  isActive: boolean;
}

export interface PdfTemplateAssetDto {
  id: number;
  originalFileName: string;
  storedFileName: string;
  relativeUrl: string;
  contentType: string;
  sizeBytes: number;
  reportTemplateId?: number | null;
  elementId?: string | null;
  pageNumber?: number | null;
  tempQuotattionId?: number | null;
  tempQuotattionLineId?: number | null;
  productCode?: string | null;
}

export interface PdfTablePresetListParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  ruleType?: DocumentRuleType;
  isActive?: boolean;
}

export interface PdfTablePresetListResult {
  items: PdfTablePresetDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PdfTablePresetCreateDto {
  ruleType: DocumentRuleType;
  name: string;
  key: string;
  columns: NonNullable<ReportTemplateElementDto['columns']>;
  tableOptions?: NonNullable<ReportTemplateElementDto['tableOptions']>;
  isActive: boolean;
}

export type PdfTablePresetUpdateDto = PdfTablePresetCreateDto;
