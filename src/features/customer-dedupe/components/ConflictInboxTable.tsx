import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CustomerDuplicateCandidateDto } from '../types/customerDedupe.types';
import type { ConflictFiltersState } from './ConflictFilters';
import { MATCH_TYPES } from './ConflictFilters';
import { MergePreviewDialog } from './MergePreviewDialog';
import { useMergeCustomersMutation } from '../hooks/useMergeCustomersMutation';
import { Eye, Merge } from 'lucide-react';
import { cn } from '@/lib/utils';

function filterAndSort(
  list: CustomerDuplicateCandidateDto[],
  filters: ConflictFiltersState
): CustomerDuplicateCandidateDto[] {
  let result = [...list];
  const search = filters.search.trim().toLowerCase();
  if (search) {
    result = result.filter(
      (row) =>
        row.masterCustomerName?.toLowerCase().includes(search) ||
        row.duplicateCustomerName?.toLowerCase().includes(search)
    );
  }
  if (filters.matchType) {
    result = result.filter((row) => row.matchType === filters.matchType);
  }
  result = result.filter((row) => row.score >= filters.minScore);
  result.sort((a, b) => b.score - a.score);
  return result;
}

function scoreVariant(score: number): 'destructive' | 'default' | 'secondary' {
  if (score >= 0.95) return 'destructive';
  if (score >= 0.85) return 'default';
  return 'secondary';
}

function matchTypeVariant(matchType: string): 'destructive' | 'default' | 'secondary' {
  if (matchType === 'TaxNumber') return 'destructive';
  if (matchType === 'TcknNumber') return 'default';
  return 'secondary';
}

export type ConflictInboxColumnKey = 'masterCustomer' | 'duplicateCustomer' | 'matchType' | 'score';

export interface ConflictInboxTableProps {
  candidates: CustomerDuplicateCandidateDto[];
  filters: ConflictFiltersState;
  onMergeSuccess?: () => void;
}

export function ConflictInboxTable({
  candidates,
  filters,
  onMergeSuccess,
}: ConflictInboxTableProps): ReactElement {
  const { t } = useTranslation(['customerDedupe']);
  const [previewRow, setPreviewRow] = useState<CustomerDuplicateCandidateDto | null>(null);
  const mergeMutation = useMergeCustomersMutation();

  const allRows = useMemo(() => filterAndSort(candidates, filters), [candidates, filters]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const rows = useMemo(
    () => allRows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [allRows, pageNumber, pageSize]
  );

  const columns: DataTableGridColumn<ConflictInboxColumnKey>[] = useMemo(
    () => [
      { key: 'masterCustomer', label: t('masterCustomer') },
      { key: 'duplicateCustomer', label: t('duplicateCustomer') },
      { key: 'matchType', label: t('matchType') },
      { key: 'score', label: t('score') },
    ],
    [t]
  );

  const renderCell = (row: CustomerDuplicateCandidateDto, key: ConflictInboxColumnKey): React.ReactNode => {
    if (key === 'masterCustomer') {
      return (
        <div>
          <div className="font-medium">{row.masterCustomerName}</div>
          <div className="text-xs text-muted-foreground">ID: {row.masterCustomerId}</div>
        </div>
      );
    }
    if (key === 'duplicateCustomer') {
      return (
        <div>
          <div className="font-medium">{row.duplicateCustomerName}</div>
          <div className="text-xs text-muted-foreground">ID: {row.duplicateCustomerId}</div>
        </div>
      );
    }
    if (key === 'matchType') {
      return MATCH_TYPES.includes(row.matchType as (typeof MATCH_TYPES)[number]) ? (
        <Badge variant={matchTypeVariant(row.matchType)}>{t(row.matchType)}</Badge>
      ) : (
        <Badge variant="outline">{row.matchType}</Badge>
      );
    }
    if (key === 'score') {
      return (
        <Badge
          variant={scoreVariant(row.score)}
          className={cn(
            row.score >= 0.95 && 'bg-red-500/90',
            row.score >= 0.85 && row.score < 0.95 && 'bg-amber-500/90'
          )}
        >
          {(row.score * 100).toFixed(0)}%
        </Badge>
      );
    }
    return '-';
  };

  const renderActionsCell = (row: CustomerDuplicateCandidateDto): ReactElement => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setPreviewRow(row)}>
        <Eye className="h-4 w-4 mr-1" />
        {t('previewMerge')}
      </Button>
      <Button
        variant="default"
        size="sm"
        disabled={mergeMutation.isPending}
        onClick={() => {
          mergeMutation.mutate(
            {
              masterCustomerId: row.masterCustomerId,
              duplicateCustomerId: row.duplicateCustomerId,
              preferMasterValues: true,
            },
            { onSuccess: onMergeSuccess }
          );
        }}
      >
        <Merge className="h-4 w-4 mr-1" />
        {t('merge')}
      </Button>
    </div>
  );

  const rowKey = (row: CustomerDuplicateCandidateDto): string =>
    `${row.masterCustomerId}-${row.duplicateCustomerId}`;

  return (
    <>
      <DataTableGrid<CustomerDuplicateCandidateDto, ConflictInboxColumnKey>
        columns={columns}
        visibleColumnKeys={['masterCustomer', 'duplicateCustomer', 'matchType', 'score']}
        rows={rows}
        rowKey={rowKey}
        renderCell={renderCell}
        isLoading={false}
        isError={false}
        loadingText={t('loading', { defaultValue: 'Loading...' })}
        errorText={t('loadError', { defaultValue: 'An error occurred' })}
        emptyText={t('emptyDescription')}
        minTableWidthClassName="min-w-[800px]"
        showActionsColumn
        actionsHeaderLabel={t('actions')}
        renderActionsCell={renderActionsCell}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPageNumber(1);
        }}
        pageNumber={pageNumber}
        totalPages={totalPages}
        hasPreviousPage={pageNumber > 1}
        hasNextPage={pageNumber < totalPages}
        onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
        onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
        previousLabel={t('common:previous', { ns: 'common', defaultValue: 'Previous' })}
        nextLabel={t('common:next', { ns: 'common', defaultValue: 'Next' })}
        paginationInfoText={t('common.table.showing', {
          from: allRows.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1,
          to: Math.min(pageNumber * pageSize, allRows.length),
          total: allRows.length,
        })}
      />

      {previewRow && (
        <MergePreviewDialog
          candidate={previewRow}
          open={!!previewRow}
          onOpenChange={(open) => !open && setPreviewRow(null)}
          onMergeSuccess={() => {
            setPreviewRow(null);
            onMergeSuccess?.();
          }}
        />
      )}
    </>
  );
}
