import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { CustomerDuplicateCandidateDto } from '../types/customerDedupe.types';
import type { ConflictFiltersState } from './ConflictFilters';
import { MATCH_TYPES } from './ConflictFilters';
import { MergePreviewDialog } from './MergePreviewDialog';
import { useMergeCustomersMutation } from '../hooks/useMergeCustomersMutation';
import { Eye, Merge } from 'lucide-react';
import { useMemo, useState } from 'react';
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

function matchTypeVariant(
  matchType: string
): 'destructive' | 'default' | 'secondary' {
  if (matchType === 'TaxNumber') return 'destructive';
  if (matchType === 'TcknNumber') return 'default';
  return 'secondary';
}

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

  const rows = useMemo(
    () => filterAndSort(candidates, filters),
    [candidates, filters]
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('masterCustomer')}</TableHead>
              <TableHead>{t('duplicateCustomer')}</TableHead>
              <TableHead>{t('matchType')}</TableHead>
              <TableHead>{t('score')}</TableHead>
              <TableHead className="w-[200px]">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t('emptyDescription')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.masterCustomerId}-${row.duplicateCustomerId}`}>
                  <TableCell>
                    <div className="font-medium">{row.masterCustomerName}</div>
                    <div className="text-xs text-muted-foreground">ID: {row.masterCustomerId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.duplicateCustomerName}</div>
                    <div className="text-xs text-muted-foreground">ID: {row.duplicateCustomerId}</div>
                  </TableCell>
                  <TableCell>
                    {MATCH_TYPES.includes(row.matchType as (typeof MATCH_TYPES)[number]) ? (
                      <Badge variant={matchTypeVariant(row.matchType)}>
                        {t(row.matchType)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{row.matchType}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={scoreVariant(row.score)}
                      className={cn(
                        row.score >= 0.95 && 'bg-red-500/90',
                        row.score >= 0.85 && row.score < 0.95 && 'bg-amber-500/90'
                      )}
                    >
                      {(row.score * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewRow(row)}
                      >
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
