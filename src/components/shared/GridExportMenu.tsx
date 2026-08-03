import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import type { GridExportColumn } from '@/lib/grid-export';
import { cn } from '@/lib/utils';

interface GridExportConfig {
  fileName: string;
  columns: GridExportColumn[];
  rows: Record<string, unknown>[];
  getExportData?: () => Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }>;
  pdfRightAlignedColumnKeys?: readonly string[];
}

interface GridExportMenuProps extends GridExportConfig {
  translationNamespace?: string;
  triggerClassName?: string;
}

interface GridExportController {
  isExporting: boolean;
  handleExcelExport: () => Promise<void>;
  handleCsvExport: () => Promise<void>;
  handlePdfExport: () => Promise<void>;
}

function useGridExport({
  fileName,
  columns,
  rows,
  getExportData,
  pdfRightAlignedColumnKeys,
}: GridExportConfig): GridExportController {
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useTranslation('common');

  const resolveExportData = async (): Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }> => {
    if (getExportData) {
      const data = await getExportData();
      return { columns: data.columns, rows: data.rows };
    }
    return { columns, rows };
  };

  const runExport = async (exportAction: () => Promise<void> | void): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportAction();
    } catch {
      toast.error(t('exportFailed', { defaultValue: 'Çıktı oluşturulamadı. Lütfen tekrar deneyin.' }));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelExport = (): Promise<void> => runExport(async () => {
    const { columns: resolvedColumns, rows: resolvedRows } = await resolveExportData();
    const { exportGridToExcel } = await import('@/lib/grid-export');
    await exportGridToExcel({ fileName, columns: resolvedColumns, rows: resolvedRows });
  });

  const handleCsvExport = (): Promise<void> => runExport(async () => {
    const { columns: resolvedColumns, rows: resolvedRows } = await resolveExportData();
    const { exportGridToCsv } = await import('@/lib/grid-export');
    exportGridToCsv({ fileName, columns: resolvedColumns, rows: resolvedRows });
  });

  const handlePdfExport = (): Promise<void> => runExport(async () => {
    const { columns: resolvedColumns, rows: resolvedRows } = await resolveExportData();
    const { exportGridToPdf } = await import('@/lib/grid-export');
    await exportGridToPdf({
      fileName,
      columns: resolvedColumns,
      rows: resolvedRows,
      pdfRightAlignedColumnKeys,
    });
  });

  return { isExporting, handleExcelExport, handleCsvExport, handlePdfExport };
}

function GridExportActionItems({
  controller,
  hasExportSource,
  translationNamespace,
  onActionComplete,
}: {
  controller: GridExportController;
  hasExportSource: boolean;
  translationNamespace?: string;
  onActionComplete?: () => void;
}): ReactElement {
  const { t } = useTranslation(translationNamespace ? [translationNamespace, 'common'] : 'common');
  const { isExporting, handleExcelExport, handleCsvExport, handlePdfExport } = controller;
  const run = (action: () => Promise<void>): void => {
    void action().finally(() => onActionComplete?.());
  };

  return (
    <>
      <DropdownMenuItem
        onClick={() => run(handleExcelExport)}
        disabled={isExporting || !hasExportSource}
        className="cursor-pointer"
      >
        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
        {isExporting
          ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
          : t('exportExcel', { ns: 'common', defaultValue: 'Excel Çıktısı' })}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => run(handleCsvExport)}
        disabled={isExporting || !hasExportSource}
        className="cursor-pointer"
      >
        <FileText className="mr-2 h-4 w-4" />
        {t('exportCsv', { ns: 'common', defaultValue: 'CSV Çıktısı' })}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => run(handlePdfExport)}
        disabled={isExporting || !hasExportSource}
        className="cursor-pointer"
      >
        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileType className="mr-2 h-4 w-4" />}
        {isExporting
          ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
          : t('exportPdf', { ns: 'common', defaultValue: 'PDF Çıktısı' })}
      </DropdownMenuItem>
    </>
  );
}

export function GridExportMenuItems({
  fileName,
  columns,
  rows,
  getExportData,
  pdfRightAlignedColumnKeys,
  translationNamespace,
  onActionComplete,
}: GridExportConfig & {
  translationNamespace?: string;
  onActionComplete?: () => void;
}): ReactElement {
  const controller = useGridExport({
    fileName,
    columns,
    rows,
    getExportData,
    pdfRightAlignedColumnKeys,
  });

  return (
    <GridExportActionItems
      controller={controller}
      hasExportSource={Boolean(getExportData) || rows.length > 0}
      translationNamespace={translationNamespace}
      onActionComplete={onActionComplete}
    />
  );
}

export function GridExportMenu({
  fileName,
  columns,
  rows,
  translationNamespace,
  getExportData,
  pdfRightAlignedColumnKeys,
  triggerClassName,
}: GridExportMenuProps): ReactElement {
  const { t } = useTranslation(translationNamespace ? [translationNamespace, 'common'] : 'common');
  const controller = useGridExport({ fileName, columns, rows, getExportData, pdfRightAlignedColumnKeys });
  const { isExporting } = controller;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className={cn(
            'h-9 border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm',
            triggerClassName
          )}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          {isExporting
            ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
            : t('export', { ns: 'common', defaultValue: 'Çıktı Al' })}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <GridExportActionItems
          controller={controller}
          hasExportSource={Boolean(getExportData) || rows.length > 0}
          translationNamespace={translationNamespace}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
