import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConflictFilters, type ConflictFiltersState } from './ConflictFilters';
import { ConflictInboxTable } from './ConflictInboxTable';
import { useDuplicateCandidatesQuery } from '../hooks/useDuplicateCandidatesQuery';
import { useUIStore } from '@/stores/ui-store';
import { useEffect } from 'react';

const DEFAULT_FILTERS: ConflictFiltersState = {
  search: '',
  matchType: '',
  minScore: 0.7,
};

export function ConflictInboxPage(): ReactElement {
  const { t } = useTranslation(['customerDedupe', 'common']);
  const { setPageTitle } = useUIStore();
  const [filters, setFilters] = useState<ConflictFiltersState>(DEFAULT_FILTERS);

  const { data: candidates = [], isLoading, isError, refetch } = useDuplicateCandidatesQuery();

  useEffect(() => {
    setPageTitle(t('customerDedupe:title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const isEmpty = useMemo(() => !isLoading && !isError && candidates.length === 0, [isLoading, isError, candidates.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('customerDedupe:title')}</h1>
          <p className="text-muted-foreground">{t('customerDedupe:subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('customerDedupe:refresh')}
        </Button>
      </div>

      <ConflictFilters value={filters} onChange={setFilters} />

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>{t('customerDedupe:loadErrorTitle')}</CardTitle>
            <CardDescription>{t('customerDedupe:loadErrorDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void refetch()}>
              {t('customerDedupe:retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && isEmpty && (
        <Card>
          <CardHeader>
            <CardTitle>{t('customerDedupe:emptyTitle')}</CardTitle>
            <CardDescription>{t('customerDedupe:emptyDescription')}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !isError && !isEmpty && (
        <ConflictInboxTable
          candidates={candidates}
          filters={filters}
          onMergeSuccess={() => void refetch()}
        />
      )}
    </div>
  );
}
