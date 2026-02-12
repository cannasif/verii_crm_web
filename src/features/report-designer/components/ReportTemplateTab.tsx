import type { ReactElement } from 'react';
import { useState, useEffect, useRef } from 'react';
import { usePdfReportTemplateList } from '@/features/pdf-report-designer/hooks/usePdfReportTemplateList';
import { useGeneratePdfReportDocument } from '@/features/pdf-report-designer/hooks/useGeneratePdfReportDocument';
import { DocumentRuleType, type ReportTemplateGetDto } from '@/features/pdf-report';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const RULE_TYPE_EMPTY_LABELS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'reportDesigner.preview.emptyDemand',
  [DocumentRuleType.Quotation]: 'reportDesigner.preview.emptyQuotation',
  [DocumentRuleType.Order]: 'reportDesigner.preview.emptyOrder',
};

interface ReportTemplateTabProps {
  entityId: number;
  ruleType: DocumentRuleType;
}

export function ReportTemplateTab({ entityId, ruleType }: ReportTemplateTabProps): ReactElement {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  pdfBlobUrlRef.current = pdfBlobUrl;

  const { data: listData, isLoading: isLoadingTemplates } = usePdfReportTemplateList();
  const templates = listData?.items ?? [];
  const generatePdfMutation = useGeneratePdfReportDocument();

  const filteredTemplates: ReportTemplateGetDto[] = templates.filter(
    (template) => Number(template.ruleType) === ruleType
  );
  const defaultTemplateRef = useRef(false);
  useEffect(() => {
    if (defaultTemplateRef.current || filteredTemplates.length === 0) return;
    const defaultTemplate = filteredTemplates.find((template) => template.default === true);
    if (defaultTemplate != null) {
      defaultTemplateRef.current = true;
      setSelectedTemplateId(String(defaultTemplate.id));
    }
  }, [filteredTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const templateId = parseInt(selectedTemplateId, 10);
    if (Number.isNaN(templateId) || templateId < 1) return;

    let cancelled = false;
    generatePdfMutation.mutate(
      { templateId, entityId },
      {
        onSuccess: (blob) => {
          if (cancelled) {
            URL.revokeObjectURL(URL.createObjectURL(blob));
            return;
          }
          setPdfBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        },
        onError: (err: Error) => {
          if (!cancelled) {
            toast.error(t('common.pdfGenerateFailed'), {
              description: err?.message,
            });
          }
        },
      }
    );
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, entityId]);

  useEffect(() => {
    return () => {
      const url = pdfBlobUrlRef.current;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const isGenerating =
    Boolean(selectedTemplateId) && (generatePdfMutation.isPending || !pdfBlobUrl);
  const emptyLabel = t(RULE_TYPE_EMPTY_LABELS[ruleType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
        <div className="grid w-full max-w-md gap-2">
          <Label htmlFor="report-template">{t('reportDesigner.preview.label')}</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            disabled={isLoadingTemplates}
          >
            <SelectTrigger id="report-template" className="w-full">
              <SelectValue placeholder={t('reportDesigner.preview.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {filteredTemplates.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  {isLoadingTemplates ? t('reportDesigner.preview.loading') : emptyLabel}
                </SelectItem>
              ) : (
                filteredTemplates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.title}
                    {template.default === true ? t('reportDesigner.preview.defaultSuffix') : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTemplateId && selectedTemplateId !== '__none__' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30 overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="size-10 animate-spin text-slate-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('reportDesigner.preview.generating')}
              </p>
            </div>
          ) : pdfBlobUrl ? (
            <div className="min-h-[480px] bg-slate-200 dark:bg-slate-800">
              <iframe
                title={t('reportDesigner.preview.iframeTitle')}
                src={pdfBlobUrl}
                className="w-full h-[calc(100vh-280px)] min-h-[480px] border-0"
              />
            </div>
          ) : null}
        </div>
      )}

      {selectedTemplateId && !selectedTemplateId.startsWith('__') && !isGenerating && !pdfBlobUrl && generatePdfMutation.isError && (
        <p className="text-sm text-destructive">
          {t('reportDesigner.preview.loadFailed')}
        </p>
      )}
    </div>
  );
}
