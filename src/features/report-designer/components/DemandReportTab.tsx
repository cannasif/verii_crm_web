import type { ReactElement } from 'react';
import { ReportTemplateTab } from './ReportTemplateTab';
import { DocumentRuleType } from '@/features/pdf-report';

interface DemandReportTabProps {
  demandId: number;
  builtInTemplates?: {
    id: string;
    title: string;
    isDefault?: boolean;
    generate: () => Promise<Blob>;
  }[];
}

export function DemandReportTab({ demandId, builtInTemplates }: DemandReportTabProps): ReactElement {
  return (
    <ReportTemplateTab
      entityId={demandId}
      ruleType={DocumentRuleType.Demand}
      builtInTemplates={builtInTemplates}
    />
  );
}
