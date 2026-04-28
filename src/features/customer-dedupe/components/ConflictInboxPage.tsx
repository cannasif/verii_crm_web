import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { ConflictInboxTable } from './ConflictInboxTable';
import { useDuplicateCandidatesQuery } from '../hooks/useDuplicateCandidatesQuery';
import { CANDIDATES_QUERY_KEY } from '../hooks/useDuplicateCandidatesQuery';
import { useUIStore } from '@/stores/ui-store';
import { Filter, Loader2, RefreshCw, GitMerge, AlertTriangle, FileSearch } from 'lucide-react';
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
        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10">
                <GitMerge className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <Skeleton className="h-6 w-48 rounded-xl" />
                <Skeleton className="h-4 w-64 mt-2 rounded-xl" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 shadow-inner border border-red-200 dark:border-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{t('customerDedupe:loadErrorTitle')}</CardTitle>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('customerDedupe:loadErrorDescription')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => void refetch()}
              className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] h-11 px-6"
            >
              {t('customerDedupe:retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {isEmpty && (
        <Card className="overflow-hidden rounded-2x1 border-white/20 bg-white dark:bg-[#180F22] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <FileSearch className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700 dark:text-white">{t('customerDedupe:emptyTitle')}</p>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">{t('customerDedupe:emptyDescription')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !isEmpty && (
        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <GitMerge className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  {t('customerDedupe:tableTitle', { defaultValue: t('customerDedupe:title') })}
                </CardTitle>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {t('customerDedupe:subtitle')}
                </p>
              </div>
              {candidates.length > 0 && (
                <Badge className="ml-auto rounded-xl border border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400 font-bold px-3 py-1 shadow-sm">
                  {candidates.length}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Input
                placeholder={t('customerDedupe:searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="h-10 w-[220px] rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasFiltersActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-10 rounded-xl font-semibold gap-2 transition-all ${hasFiltersActive
                      ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-500/30 hover:bg-pink-500/30'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                  >
                    <Filter className="h-4 w-4" />
                    {t('common:filters')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-4 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-[#180F22] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 transition-all font-medium">
                          <SelectValue placeholder={t('customerDedupe:matchType')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                          <SelectItem value={MATCH_TYPE_ALL_SELECT_VALUE} className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">
                            {t('customerDedupe:all')}
                          </SelectItem>
                          {MATCH_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">
                              {t(`customerDedupe:${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('customerDedupe:minScore')}
                      </label>
                      <Select
                        value={String(filters.minScore)}
                        onValueChange={(v) =>
                          setFilters((prev) => ({ ...prev, minScore: Number(v) }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-[#180F22] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 transition-all font-medium">
                          <SelectValue placeholder={t('customerDedupe:minScore')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                          {MIN_SCORE_OPTIONS.map((score) => (
                            <SelectItem key={score} value={String(score)} className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">
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
                className="h-10 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] hover:bg-slate-100 dark:hover:bg-white/5 font-semibold gap-2 transition-all"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {resolveLabel(t, 'common.refresh', 'Yenile')}
              </Button>

              <div className="hidden">
                <DataTableActionBar
                  pageKey="conflict-inbox"
                  columns={baseColumns}
                  visibleColumns={['masterCustomer', 'duplicateCustomer', 'matchType', 'score']}
                  columnOrder={['masterCustomer', 'duplicateCustomer', 'matchType', 'score']}
                  onVisibleColumnsChange={() => { }}
                  onColumnOrderChange={() => { }}
                  exportFileName="conflict-inbox"
                  exportColumns={baseColumns.map((c) => ({ key: c.key, label: c.label }))}
                  exportRows={[]}
                  filterColumns={[]}
                  defaultFilterColumn="masterCustomer"
                  draftFilterRows={[]}
                  onDraftFilterRowsChange={() => { }}
                  onApplyFilters={() => { }}
                  onClearFilters={() => { }}
                  translationNamespace="customerDedupe"
                  appliedFilterCount={hasFiltersActive ? 1 : 0}
                />
              </div>
            </div>
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
