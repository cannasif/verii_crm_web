import type { ReactElement } from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePdfReportTemplateList } from '@/features/pdf-report-designer/hooks/usePdfReportTemplateList';
import { pdfReportTemplateApi } from '@/features/pdf-report/api/pdf-report-template-api';
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
  [DocumentRuleType.FastQuotation]: 'reportDesigner.preview.emptyFastQuotation',
};

const EMPTY_BUILT_IN_TEMPLATES: NonNullable<ReportTemplateTabProps['builtInTemplates']> = [];

interface ReportTemplateTabProps {
  entityId: number;
  ruleType: DocumentRuleType;
  builtInTemplates?: {
    id: string;
    title: string;
    isDefault?: boolean;
    generate: () => Promise<Blob>;
  }[];
}

export function ReportTemplateTab({
  entityId,
  ruleType,
  builtInTemplates,
}: ReportTemplateTabProps): ReactElement {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const pdfBlobUrlRef = useRef<string | null>(null);
  pdfBlobUrlRef.current = pdfBlobUrl;

  const { data: listData, isLoading: isLoadingTemplates } = usePdfReportTemplateList({
    ruleType,
    isActive: true,
    pageSize: 100,
  });
  const templates = listData?.items ?? [];
  const stableBuiltInTemplates = builtInTemplates ?? EMPTY_BUILT_IN_TEMPLATES;
  const filteredTemplates: ReportTemplateGetDto[] = templates.filter(
    (template) => Number(template.ruleType) === ruleType
  );
  const effectiveBuiltInTemplates = useMemo(
    () => (filteredTemplates.length > 0 ? EMPTY_BUILT_IN_TEMPLATES : stableBuiltInTemplates),
    [filteredTemplates.length, stableBuiltInTemplates]
  );
  const builtInTemplateMap = useMemo(
    () => new Map(effectiveBuiltInTemplates.map((template) => [template.id, template])),
    [effectiveBuiltInTemplates]
  );
  const selectedBuiltInTemplate = useMemo(
    () => builtInTemplateMap.get(selectedTemplateId),
    [builtInTemplateMap, selectedTemplateId]
  );
  const selectionStorageKey = useMemo(
    () => `report-template-selection:${ruleType}`,
    [ruleType]
  );

  const persistSelection = useCallback((value: string): void => {
    try {
      localStorage.setItem(selectionStorageKey, value);
    } catch {
      // ignore
    }
  }, [selectionStorageKey]);

  const selectableIds = useMemo(
    () => new Set([
      ...effectiveBuiltInTemplates.map((template) => template.id),
      ...filteredTemplates.map((template) => String(template.id)),
    ]),
    [effectiveBuiltInTemplates, filteredTemplates]
  );

  useEffect(() => {
    if (selectedTemplateId && selectableIds.has(selectedTemplateId)) return;

    let storedSelection = '';
    try {
      storedSelection = localStorage.getItem(selectionStorageKey) ?? '';
    } catch {
      storedSelection = '';
    }

    if (storedSelection && selectableIds.has(storedSelection)) {
      setSelectedTemplateId(storedSelection);
      return;
    }

    const builtInDefaultTemplate = effectiveBuiltInTemplates.find((template) => template.isDefault === true);
    if (builtInDefaultTemplate != null) {
      setSelectedTemplateId(builtInDefaultTemplate.id);
      persistSelection(builtInDefaultTemplate.id);
      return;
    }

    const defaultTemplate = filteredTemplates.find((template) => template.default === true);
    if (defaultTemplate != null) {
      const value = String(defaultTemplate.id);
      setSelectedTemplateId(value);
      persistSelection(value);
      return;
    }

    const fallbackTemplate = effectiveBuiltInTemplates[0]?.id ?? (filteredTemplates[0] ? String(filteredTemplates[0].id) : '');
    if (fallbackTemplate) {
      setSelectedTemplateId(fallbackTemplate);
      persistSelection(fallbackTemplate);
    }
  }, [effectiveBuiltInTemplates, filteredTemplates, persistSelection, selectableIds, selectedTemplateId, selectionStorageKey]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setIsGenerating(false);
      setHasPreviewError(false);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (selectedBuiltInTemplate != null) {
      let cancelled = false;
      setIsGenerating(true);
      setHasPreviewError(false);

      void selectedBuiltInTemplate
        .generate()
        .then((blob) => {
          if (cancelled) return;

          setPdfBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        })
        .catch((err: Error) => {
          if (cancelled) return;

          setPdfBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          setHasPreviewError(true);
          toast.error(t('common.pdfGenerateFailed'), {
            description: err?.message,
          });
        })
        .finally(() => {
          if (!cancelled) {
            setIsGenerating(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }
    const templateId = parseInt(selectedTemplateId, 10);
    if (Number.isNaN(templateId) || templateId < 1) return;

    let cancelled = false;
    setIsGenerating(true);
    setHasPreviewError(false);

    void pdfReportTemplateApi
      .generateDocument(templateId, entityId)
      .then((blob) => {
        if (cancelled) return;

        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;

        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setHasPreviewError(true);
        toast.error(t('common.pdfGenerateFailed'), {
          description: err?.message,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, entityId, t, selectedBuiltInTemplate]);

  useEffect(() => {
    return () => {
      const url = pdfBlobUrlRef.current;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const emptyLabel = t(RULE_TYPE_EMPTY_LABELS[ruleType]);
  const hasSelectableTemplates = effectiveBuiltInTemplates.length > 0 || filteredTemplates.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
        <div className="grid w-full max-w-md gap-2">
          <Label htmlFor="report-template">{t('reportDesigner.preview.label')}</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(value) => {
              setSelectedTemplateId(value);
              persistSelection(value);
            }}
            disabled={isLoadingTemplates}
          >
            <SelectTrigger id="report-template" className="w-full">
              <SelectValue placeholder={t('reportDesigner.preview.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {!hasSelectableTemplates ? (
                <SelectItem value="__none__" disabled>
                  {isLoadingTemplates ? t('reportDesigner.preview.loading') : emptyLabel}
                </SelectItem>
              ) : (
                <>
                  {effectiveBuiltInTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                      {template.isDefault === true ? t('reportDesigner.preview.defaultSuffix') : ''}
                    </SelectItem>
                  ))}
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.title}
                      {template.default === true ? t('reportDesigner.preview.defaultSuffix') : ''}
                    </SelectItem>
                  ))}
                </>
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

      {selectedTemplateId && !selectedTemplateId.startsWith('__') && !isGenerating && !pdfBlobUrl && hasPreviewError && (
        <p className="text-sm text-destructive">
          {t('reportDesigner.preview.loadFailed')}
        </p>
      )}
    </div>
  );
}
