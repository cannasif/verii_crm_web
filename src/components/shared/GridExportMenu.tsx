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
import { exportGridToExcel, exportGridToPdf, type GridExportColumn } from '@/lib/grid-export';

interface GridExportMenuProps {
  fileName: string;
  columns: GridExportColumn[];
  rows: Record<string, unknown>[];
  translationNamespace?: string;
  getExportData?: () => Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }>;
}

export function GridExportMenu({ fileName, columns, rows, translationNamespace, getExportData }: GridExportMenuProps): ReactElement {
  const { t } = useTranslation(translationNamespace ? [translationNamespace, 'common'] : 'common');
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
      await exportGridToPdf({ fileName, columns: resolvedColumns, rows: resolvedRows });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="h-9 border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm"
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
        <DropdownMenuItem
          onClick={handleExcelExport}
          disabled={isExporting || rows.length === 0}
          className="cursor-pointer"
        >
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          {isExporting
            ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
            : t('exportExcel', { ns: 'common', defaultValue: 'Excel Çıktısı' })}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handlePdfExport}
          disabled={isExporting || rows.length === 0}
          className="cursor-pointer"
        >
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileType className="mr-2 h-4 w-4" />}
          {isExporting
            ? t('exportPreparing', { ns: 'common', defaultValue: 'Hazırlanıyor...' })
            : t('exportPdf', { ns: 'common', defaultValue: 'PDF Çıktısı' })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
