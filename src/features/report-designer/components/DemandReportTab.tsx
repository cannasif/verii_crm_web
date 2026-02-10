import type { ReactElement } from 'react';
import { ReportTemplateTab } from './ReportTemplateTab';
import { DocumentRuleType } from '@/features/pdf-report';

interface DemandReportTabProps {
  demandId: number;
}

export function DemandReportTab({ demandId }: DemandReportTabProps): ReactElement {
  return <ReportTemplateTab entityId={demandId} ruleType={DocumentRuleType.Demand} />;
}
