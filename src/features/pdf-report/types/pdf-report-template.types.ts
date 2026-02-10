export const DocumentRuleType = {
  Demand: 0,
  Quotation: 1,
  Order: 2,
} as const;

export type DocumentRuleType = (typeof DocumentRuleType)[keyof typeof DocumentRuleType];

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
}

export interface PdfReportElementStyleDto {
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
  columns?: { label: string; path: string }[];
  zIndex?: number;
  rotation?: number;
  locked?: boolean;
  hidden?: boolean;
  style?: PdfReportElementStyleDto;
}

export interface ReportTemplateDataDto {
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
}

export interface PdfReportTemplateListResult {
  items: ReportTemplateGetDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
