import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileSpreadsheet, FileType, Loader2 } from 'lucide-react';
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

function useGridExport({
  fileName,
  columns,
  rows,
  getExportData,
  pdfRightAlignedColumnKeys,
}: GridExportConfig): {
  isExporting: boolean;
  handleExcelExport: () => Promise<void>;
  handlePdfExport: () => Promise<void>;
} {
  const [isExporting, setIsExporting] = useState(false);

  const resolveExportData = async (): Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }> => {
    if (getExportData) {
      const data = await getExportData();
      return { columns: data.columns, rows: data.rows };
    }
    return { columns, rows };
  };

  const handleExcelExport = async (): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { columns: resolvedColumns, rows: resolvedRows } = await resolveExportData();
      const { exportGridToExcel } = await import('@/lib/grid-export');
      await exportGridToExcel({ fileName, columns: resolvedColumns, rows: resolvedRows });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePdfExport = async (): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { columns: resolvedColumns, rows: resolvedRows } = await resolveExportData();
      const { exportGridToPdf } = await import('@/lib/grid-export');
      await exportGridToPdf({
        fileName,
        columns: resolvedColumns,
        rows: resolvedRows,
        pdfRightAlignedColumnKeys,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleExcelExport, handlePdfExport };
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
  const { t } = useTranslation(translationNamespace ? [translationNamespace, 'common'] : 'common');
  const { isExporting, handleExcelExport, handlePdfExport } = useGridExport({
    fileName,
    columns,
    rows,
    getExportData,
    pdfRightAlignedColumnKeys,
  });

  const runExcelExport = (): void => {
    void handleExcelExport().finally(() => {
      onActionComplete?.();
    });
  };

  const runPdfExport = (): void => {
    void handlePdfExport().finally(() => {
      onActionComplete?.();
    });
  };

  return (
    <>
      <DropdownMenuItem
        onClick={runExcelExport}
        disabled={isExporting || rows.length === 0}
        className="cursor-pointer"
      >
        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
        {isExporting
          ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
          : t('exportExcel', { ns: 'common', defaultValue: 'Excel Çıktısı' })}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={runPdfExport}
        disabled={isExporting || rows.length === 0}
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
  const { isExporting } = useGridExport({ fileName, columns, rows, getExportData, pdfRightAlignedColumnKeys });

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
        <GridExportMenuItems
          fileName={fileName}
          columns={columns}
          rows={rows}
          getExportData={getExportData}
          pdfRightAlignedColumnKeys={pdfRightAlignedColumnKeys}
          translationNamespace={translationNamespace}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
