import { type ReactElement } from 'react';
import {
  SalesDocumentProcessProgressModal,
  describeSalesDocumentProcessError,
  type SalesDocumentProcessKind,
  type SalesDocumentProcessOutcome,
  type SalesDocumentProcessProgressModalProps,
} from '@/features/sales-documents/process-progress/SalesDocumentProcessProgressModal';

export type QuotationProcessKind = SalesDocumentProcessKind;
export type QuotationProcessOutcome = SalesDocumentProcessOutcome;
export type QuotationProcessErrorDescription = ReturnType<typeof describeSalesDocumentProcessError>;
export const describeQuotationProcessError = describeSalesDocumentProcessError;

export interface QuotationProcessProgressModalProps extends Omit<
  SalesDocumentProcessProgressModalProps,
  'documentKind' | 'processKind' | 'documentId' | 'documentNo' | 'onViewDocument'
> {
  kind: QuotationProcessKind;
  quotationId: number;
  quotationNo?: string | null;
  onViewQuotation?: () => void;
}

export function QuotationProcessProgressModal({
  kind,
  quotationId,
  quotationNo,
  onViewQuotation,
  ...props
}: QuotationProcessProgressModalProps): ReactElement {
  return (
    <SalesDocumentProcessProgressModal
      {...props}
      documentKind="quotation"
      processKind={kind}
      documentId={quotationId}
      documentNo={quotationNo}
      onViewDocument={onViewQuotation}
    />
  );
}
