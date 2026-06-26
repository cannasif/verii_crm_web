export type DocumentFieldLabelDocumentType = 'Demand' | 'Quotation' | 'Order';
export type DocumentFieldLabelScope = 'HeaderNote' | 'LineDescription';

export interface DocumentFieldLabelDto {
  id: number;
  documentType: DocumentFieldLabelDocumentType;
  scope: DocumentFieldLabelScope;
  fieldKey: string;
  defaultLabel: string;
  customLabel?: string | null;
  effectiveLabel: string;
  helpText?: string | null;
  placeholder?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface UpdateDocumentFieldLabelDto {
  documentType: DocumentFieldLabelDocumentType;
  scope: DocumentFieldLabelScope;
  fieldKey: string;
  customLabel?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
  isActive: boolean;
}

export interface UpdateDocumentFieldLabelsRequest {
  items: UpdateDocumentFieldLabelDto[];
}

export type DocumentContextKey = 'demand' | 'quotation' | 'order';

export const DOCUMENT_CONTEXT_TO_TYPE: Record<DocumentContextKey, DocumentFieldLabelDocumentType> = {
  demand: 'Demand',
  quotation: 'Quotation',
  order: 'Order',
};
