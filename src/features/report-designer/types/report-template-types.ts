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
