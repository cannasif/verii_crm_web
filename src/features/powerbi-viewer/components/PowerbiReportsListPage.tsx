import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { usePowerbiReportsList } from '../hooks/usePowerbiViewer';
import type { PowerBIReportListItemDto } from '../types/powerbiViewer.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';

export function PowerbiReportsListPage(): ReactElement {
  const { t } = useTranslation(['powerbi-viewer', 'common']);
  const { setPageTitle } = useUIStore();
  const { data: items = [], isLoading } = usePowerbiReportsList();

  useEffect(() => {
    setPageTitle(t('powerbiViewer.listTitle'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('powerbiViewer.listTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('powerbiViewer.listDescription')}
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('powerbiViewer.name')}</TableHead>
              <TableHead>{t('powerbiViewer.description')}</TableHead>
              <TableHead>{t('powerbiViewer.isActive')}</TableHead>
              <TableHead className="text-right w-[120px]">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row: PowerBIReportListItemDto) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate">
                    {row.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>
                      {row.isActive ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/powerbi/reports/${row.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {t('powerbiViewer.view')}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
