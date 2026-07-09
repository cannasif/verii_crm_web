import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Salesmen360ExcelExportButtonProps {
  disabled?: boolean;
  isExporting?: boolean;
  onClick: () => void;
}

export function Salesmen360ExcelExportButton({
  disabled = false,
  isExporting = false,
  onClick,
}: Salesmen360ExcelExportButtonProps): ReactElement {
  const { t } = useTranslation('common');

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-2"
      disabled={disabled || isExporting}
      onClick={onClick}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      )}
      {isExporting ? t('exportPreparing') : t('exportExcel')}
    </Button>
  );
}
