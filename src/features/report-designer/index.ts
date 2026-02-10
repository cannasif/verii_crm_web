/**
 * @deprecated Prefer importing from `@/features/pdf-report-designer` and `@/features/pdf-report`.
 * This module re-exports for backward compatibility; new code should use pdf-report-designer.
 */
export {
  PdfReportDesignerListPage as ReportDesignerListPage,
  PdfReportDesignerCreatePage as ReportDesignerCreatePage,
} from '@/features/pdf-report-designer';

export { DocumentRuleType } from '@/features/pdf-report';

export { DemandReportTab } from './components/DemandReportTab';
export { ReportTemplateTab } from './components/ReportTemplateTab';
