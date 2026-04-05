import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTableActionBar } from '@/components/shared';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { ConflictInboxTable } from './ConflictInboxTable';
import { useDuplicateCandidatesQuery } from '../hooks/useDuplicateCandidatesQuery';
import { CANDIDATES_QUERY_KEY } from '../hooks/useDuplicateCandidatesQuery';
import { useUIStore } from '@/stores/ui-store';
import { Filter, Loader2, RefreshCw } from 'lucide-react';
import { MATCH_TYPE_ALL, MATCH_TYPE_ALL_SELECT_VALUE, MATCH_TYPES, MIN_SCORE_OPTIONS, type ConflictFiltersState } from './ConflictFilters';

const DEFAULT_FILTERS: ConflictFiltersState = {
  search: '',
  matchType: '',
  minScore: 0.7,
};

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ConflictInboxPage(): ReactElement {
  const { t } = useTranslation(['customerDedupe', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ConflictFiltersState>(DEFAULT_FILTERS);

  const { data: candidates = [], isLoading, isError, refetch } = useDuplicateCandidatesQuery();

  useEffect(() => {
    setPageTitle(t('customerDedupe:title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY });
  };

  const hasFiltersActive = filters.matchType !== MATCH_TYPE_ALL || filters.minScore !== 0.7;

  const isEmpty = !isLoading && !isError && candidates.length === 0;

  const baseColumns = [
    { key: 'masterCustomer', label: t('customerDedupe:masterCustomer') },
    { key: 'duplicateCustomer', label: t('customerDedupe:duplicateCustomer') },
    { key: 'matchType', label: t('customerDedupe:matchType') },
    { key: 'score', label: t('customerDedupe:score') },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('customerDedupe:title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('customerDedupe:subtitle')}
          </p>
        </div>
      </div>

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
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
            <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
              {t('customerDedupe:tableTitle', { defaultValue: t('customerDedupe:title') })}
            </CardTitle>
            <DataTableActionBar
              pageKey="conflict-inbox"
              columns={baseColumns}
              visibleColumns={['masterCustomer', 'duplicateCustomer', 'matchType', 'score']}
              columnOrder={['masterCustomer', 'duplicateCustomer', 'matchType', 'score']}
              onVisibleColumnsChange={() => {}}
              onColumnOrderChange={() => {}}
              exportFileName="conflict-inbox"
              exportColumns={baseColumns.map((c) => ({ key: c.key, label: c.label }))}
              exportRows={[]}
              filterColumns={[]}
              defaultFilterColumn="masterCustomer"
              draftFilterRows={[]}
              onDraftFilterRowsChange={() => {}}
              onApplyFilters={() => {}}
              onClearFilters={() => {}}
              translationNamespace="customerDedupe"
              appliedFilterCount={hasFiltersActive ? 1 : 0}
              leftSlot={
                <>
                  <Input
                    placeholder={t('customerDedupe:searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="h-9 w-[200px]"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={hasFiltersActive ? 'default' : 'outline'}
                        size="sm"
                        className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                          hasFiltersActive
                            ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                            : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        {t('common:filters')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {t('customerDedupe:matchType')}
                          </label>
                          <Select
                            value={filters.matchType || MATCH_TYPE_ALL_SELECT_VALUE}
                            onValueChange={(v) =>
                              setFilters((prev) => ({
                                ...prev,
                                matchType: v === MATCH_TYPE_ALL_SELECT_VALUE ? MATCH_TYPE_ALL : v,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('customerDedupe:matchType')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MATCH_TYPE_ALL_SELECT_VALUE}>
                                {t('customerDedupe:all')}
                              </SelectItem>
                              {MATCH_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {t(`customerDedupe:${type}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {t('customerDedupe:minScore')}
                          </label>
                          <Select
                            value={String(filters.minScore)}
                            onValueChange={(v) =>
                              setFilters((prev) => ({ ...prev, minScore: Number(v) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('customerDedupe:minScore')} />
                            </SelectTrigger>
                            <SelectContent>
                              {MIN_SCORE_OPTIONS.map((score) => (
                                <SelectItem key={score} value={String(score)}>
                                  {(score * 100).toFixed(0)}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {resolveLabel(t, 'common.refresh', 'Yenile')}
                  </Button>
                </>
              }
            />
          </CardHeader>
          <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
            <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ConflictInboxTable
              candidates={candidates}
              filters={filters}
              onMergeSuccess={() => void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY })}
            />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
