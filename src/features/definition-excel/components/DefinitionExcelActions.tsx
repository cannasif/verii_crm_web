import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { FileDown, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  definitionExcelApi,
  type DefinitionExcelImportJobDto,
  type DefinitionExcelTemplateTheme,
} from '../api/definition-excel-api';

interface DefinitionExcelActionsProps {
  definitionKey: string;
  fileNamePrefix: string;
  className?: string;
  onImportCompleted?: () => void | Promise<void>;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_COUNT = 120;

function isFinalStatus(status: DefinitionExcelImportJobDto['status']): boolean {
  return status === 'Completed' || status === 'CompletedWithErrors' || status === 'Failed';
}

function getStatusTone(status: DefinitionExcelImportJobDto['status']): string {
  if (status === 'Completed') return 'text-emerald-700 dark:text-emerald-300';
  if (status === 'CompletedWithErrors') return 'text-amber-700 dark:text-amber-300';
  if (status === 'Failed') return 'text-red-700 dark:text-red-300';
  return 'text-slate-600 dark:text-slate-300';
}

function readTemplateTheme(): DefinitionExcelTemplateTheme {
  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string): string | undefined => {
    const value = styles.getPropertyValue(name).trim();
    return value.startsWith('#') ? value : undefined;
  };

  return {
    primary: read('--crm-brand-primary'),
    secondary: read('--crm-brand-secondary'),
    accent: read('--crm-brand-accent'),
    muted: read('--crm-brand-muted'),
  };
}

async function pollImportJob(jobId: number, timeoutMessage: string): Promise<DefinitionExcelImportJobDto> {
  for (let attempt = 0; attempt < MAX_POLL_COUNT; attempt += 1) {
    const job = await definitionExcelApi.getJob(jobId);
    if (isFinalStatus(job.status)) {
      return job;
    }

    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(timeoutMessage);
}

export function DefinitionExcelActions({
  definitionKey,
  fileNamePrefix,
  className,
  onImportCompleted,
}: DefinitionExcelActionsProps): ReactElement {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastJob, setLastJob] = useState<DefinitionExcelImportJobDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLastJob = async (): Promise<void> => {
      try {
        const jobs = await definitionExcelApi.getJobs(definitionKey);
        if (!cancelled) {
          setLastJob(jobs[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setLastJob(null);
        }
      }
    };

    void loadLastJob();
    return () => {
      cancelled = true;
    };
  }, [definitionKey]);

  const handleTemplateDownload = async (): Promise<void> => {
    setIsTemplateDownloading(true);
    try {
      await definitionExcelApi.downloadTemplate(definitionKey, `${fileNamePrefix}-sablon.xlsx`, readTemplateTheme());
      toast.success(t('common.definitionExcel.templateDownloaded'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.definitionExcel.templateDownloadFailed'));
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  const handleImportClick = (): void => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error(t('common.definitionExcel.invalidFileType'));
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading(t('common.definitionExcel.queueing'));

    try {
      const queued = await definitionExcelApi.queueImport(definitionKey, file);
      toast.loading(t('common.definitionExcel.processing'), { id: toastId });
      const job = await pollImportJob(queued.importJobId, t('common.definitionExcel.timedOut'));

      if (job.status === 'Failed') {
        toast.error(job.errorMessage || t('common.definitionExcel.failed'), { id: toastId });
        return;
      }

      const summary = t('common.definitionExcel.summary', {
        successRows: job.createdRows + job.updatedRows + job.restoredRows,
        failedRows: job.failedRows,
      });
      if (job.status === 'CompletedWithErrors') {
        toast.warning(t('common.definitionExcel.completedWithErrors', { summary }), {
          id: toastId,
          action: job.hasResultFile
            ? {
                label: t('common.definitionExcel.downloadResult'),
                onClick: () => {
                  void definitionExcelApi.downloadResult(job.id, `${fileNamePrefix}-aktarim-sonucu.xlsx`);
                },
              }
            : undefined,
        });
      } else {
        toast.success(t('common.definitionExcel.completed', { summary }), { id: toastId });
      }

      setLastJob(job);
      await onImportCompleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.definitionExcel.importError'), { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={cn('flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end', className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 whitespace-nowrap border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent"
          onClick={() => void handleTemplateDownload()}
          disabled={isTemplateDownloading || isImporting}
        >
          {isTemplateDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          {isTemplateDownloading ? t('common.definitionExcel.templateDownloading') : t('common.definitionExcel.templateDownload')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 whitespace-nowrap border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent"
          onClick={handleImportClick}
          disabled={isTemplateDownloading || isImporting}
        >
          {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isImporting ? t('common.definitionExcel.importInProgress') : t('common.definitionExcel.importFromExcel')}
        </Button>
      </div>
      {lastJob ? (
        <div className="hidden max-w-[min(100%,28rem)] rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 lg:block">
          <span className="font-semibold">{t('common.definitionExcel.lastImport')}:</span>{' '}
          <span className={cn('font-semibold', getStatusTone(lastJob.status))}>
            {t(`common.definitionExcel.status.${lastJob.status}`)}
          </span>{' '}
          <span>
            {t('common.definitionExcel.summary', {
              successRows: lastJob.createdRows + lastJob.updatedRows + lastJob.restoredRows,
              failedRows: lastJob.failedRows,
            })}
          </span>
          {lastJob.hasResultFile ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="ml-1 h-auto p-0 text-xs"
              onClick={() => void definitionExcelApi.downloadResult(lastJob.id, `${fileNamePrefix}-aktarim-sonucu.xlsx`)}
            >
              {t('common.definitionExcel.downloadResult')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => void handleFileChange(event)} />
    </div>
  );
}
