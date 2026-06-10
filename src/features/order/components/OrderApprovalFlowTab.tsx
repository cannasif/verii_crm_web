import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentApprovalFlowReportView } from '@/components/shared/DocumentApprovalFlowReportView';
import { useOrderApprovalFlowReport } from '../hooks/useOrderApprovalFlowReport';

interface OrderApprovalFlowTabProps {
  orderId: number;
}

export function OrderApprovalFlowTab({ orderId }: OrderApprovalFlowTabProps): ReactElement {
  const { i18n } = useTranslation(['order', 'common']);
  const { data: report, isLoading, error } = useOrderApprovalFlowReport(orderId);

  return (
    <DocumentApprovalFlowReportView
      translationNamespace="order"
      report={report ?? null}
      isLoading={isLoading}
      error={error}
      locale={i18n.language}
    />
  );
}
