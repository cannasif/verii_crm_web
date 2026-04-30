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
import { Loader2, ExternalLink, BarChart2, FileSearch } from 'lucide-react';

export function PowerbiReportsListPage(): ReactElement {
  const { t } = useTranslation(['powerbi-viewer', 'common']);
  const { setPageTitle } = useUIStore();
  const { data: items = [], isLoading } = usePowerbiReportsList();

  useEffect(() => {
    setPageTitle(t('listTitle'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-white/5 border border-pink-200 dark:border-white/10">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600 dark:text-pink-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <BarChart2 className="h-7 w-7 text-pink-600 dark:text-pink-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('listTitle')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
              {t('listDescription')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.03] shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow className="font-bold text-slate-700 dark:text-white dark:bg-[#231A2C] border-b border-slate-200 dark:border-white/5">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{t('name')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('description')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('isActive')}</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white w-[140px]">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 bg-white/50 dark:bg-transparent">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <FileSearch className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">{t('common:noData')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row: PowerBIReportListItemDto) => (
                  <TableRow key={row.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors">
                    <TableCell className="font-bold text-slate-700 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{row.name}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 max-w-md truncate border-r border-slate-200 dark:border-white/5">
                      {row.description ?? '—'}
                    </TableCell>
                    <TableCell className="border-r border-slate-200 dark:border-white/5">
                      <Badge
                        variant={row.isActive ? 'default' : 'secondary'}
                        className={`rounded-lg font-bold ${row.isActive
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                          }`}
                      >
                        {row.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        asChild
                        className="h-9 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_5px_12px_-4px_rgba(219,39,119,0.5)] gap-2
                        opacity-75 grayscale-[0] 
                        dark:opacity-100 dark:grayscale-0"
                      >
                        <Link to={`/powerbi/reports/${row.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          {t('view')}
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
    </div>
  );
}
