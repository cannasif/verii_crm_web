import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentApprovalFlowReportView } from '@/components/shared/DocumentApprovalFlowReportView';
import { useQuotationApprovalFlowReport } from '../hooks/useQuotationApprovalFlowReport';

interface QuotationApprovalFlowTabProps {
  quotationId: number;
}

export function QuotationApprovalFlowTab({ quotationId }: QuotationApprovalFlowTabProps): ReactElement {
  const { i18n } = useTranslation(['quotation', 'common']);
  const { data: report, isLoading, error } = useQuotationApprovalFlowReport(quotationId);

  return (
    <DocumentApprovalFlowReportView
      translationNamespace="quotation"
      report={report ?? null}
      isLoading={isLoading}
      error={error}
      locale={i18n.language}
    />
  );
}
