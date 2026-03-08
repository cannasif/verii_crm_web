import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReportsStore } from '../store';
import { useReportsList } from '../hooks/useReportsList';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Search } from 'lucide-react';

export function ReportsListPage(): ReactElement {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { search, setSearch } = useReportsStore();
  const { data: items = [], isLoading: loading, error: queryError } = useReportsList(search || undefined);
  const error = queryError?.message ?? null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('sidebar.reportBuilder')}</h1>
        <Button onClick={() => navigate('/reports/new')}>
          <Plus className="mr-2 size-4" />
          {t('common.reportBuilder.newReport')}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder={t('common.reportBuilder.searchReport')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>{t('common.reportBuilder.noReports')}</p>
            <Button variant="outline" className="mt-2" onClick={() => navigate('/reports/new')}>
              {t('common.reportBuilder.newReport')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigate(`/reports/${r.id}`)}
            >
              <CardContent className="flex flex-row items-center justify-between py-4">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.connectionKey} / {r.dataSourceType} / {r.dataSourceName}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString(i18n.language) : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
