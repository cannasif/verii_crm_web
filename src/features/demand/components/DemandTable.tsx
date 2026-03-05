import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { useDemandList } from '../hooks/useDemandList';
import { useCreateRevisionOfDemand } from '../hooks/useCreateRevisionOfDemand';
import type { DemandGetDto } from '../types/demand-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ChevronUp, ChevronDown, ChevronsUpDown, Mail } from 'lucide-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';

interface DemandTableProps {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onRowClick: (demandId: number) => void;
}

export function DemandTable({
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
  onRowClick,
}: DemandTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfDemand();
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<DemandGetDto | null>(null);

  const { data, isLoading, isFetching } = useDemandList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const handleRevision = async (e: React.MouseEvent, demandId: number): Promise<void> => {
    e.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(demandId);
      if (result.success && result.data?.id) {
        navigate(`/demands/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleSort = (column: string): void => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const handleOpenMailDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setSelectedDemand(demand);
    setMailDialogOpen(true);
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="ml-2 w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />
    ) : (
      <ChevronDown className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />
    );
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('demand.loading')}
        </span>
      </div>
    );
  }

  const demands = data?.data || [];

  if (!data || demands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border border-zinc-300 dark:border-zinc-700/80 border-dashed rounded-xl bg-white/50 dark:bg-card/50">
        <p className="text-sm font-medium">{t('demand.noData')}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language);
  };

  return (
    <>
      <div className="rounded-md border border-zinc-300 dark:border-zinc-700/80 overflow-hidden bg-white/50 dark:bg-card/50">
        <div className="overflow-x-auto">
        <Table className="min-w-[920px] lg:min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Id')}
              >
                <div className="flex items-center">
                  {t('demand.list.id')}
                  <SortIcon column="Id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferNo')}
              >
                <div className="flex items-center">
                  {t('demand.list.offerNo')}
                  <SortIcon column="OfferNo" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('PotentialCustomerName')}
              >
                <div className="flex items-center">
                  {t('demand.list.customer')}
                  <SortIcon column="PotentialCustomerName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('RepresentativeName')}
              >
                <div className="flex items-center">
                  {t('demand.list.representative')}
                  <SortIcon column="RepresentativeName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferDate')}
              >
                <div className="flex items-center">
                  {t('demand.list.offerDate')}
                  <SortIcon column="OfferDate" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Currency')}
              >
                <div className="flex items-center">
                  {t('demand.list.currency')}
                  <SortIcon column="Currency" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('GrandTotal')}
              >
                <div className="flex items-center justify-end">
                  {t('demand.list.grandTotal')}
                  <SortIcon column="GrandTotal" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Status')}
              >
                <div className="flex items-center">
                  {t('demand.list.status')}
                  <SortIcon column="Status" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                {t('demand.list.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.map((demand: DemandGetDto) => (
              <TableRow
                key={demand.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(demand.id)}
              >
                <TableCell className="font-medium">{demand.id}</TableCell>
                <TableCell>{demand.offerNo || '-'}</TableCell>
                <TableCell>{demand.potentialCustomerName || '-'}</TableCell>
                <TableCell>{demand.representativeName || '-'}</TableCell>
                <TableCell>{formatDate(demand.offerDate)}</TableCell>
                <TableCell>{demand.currency || '-'}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(demand.grandTotal, demand.currency || 'TRY')}
                </TableCell>
                <TableCell>
                  {typeof demand.status === 'number' && demand.status >= 0 && demand.status <= 4 ? (
                    <ApprovalStatusBadge status={demand.status as ApprovalStatus} />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleOpenMailDialog(e, demand)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {t('google-integration:mailDialog.openButton')}
                    </Button>
                    {(demand.status === 0 || demand.status === 1) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRevision(e, demand.id)}
                        disabled={createRevisionMutation.isPending}
                      >
                        {createRevisionMutation.isPending
                          ? t('demand.loading')
                          : t('demand.list.revise')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t('demand.list.showing', {
            from: (pageNumber - 1) * pageSize + 1,
            to: Math.min(pageNumber * pageSize, data.totalCount || 0),
            total: data.totalCount || 0,
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            {t('demand.previous')}
          </Button>
          <div className="flex items-center px-4 text-sm">
            {t('demand.list.page', {
              current: pageNumber,
              total: totalPages,
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('demand.next')}
          </Button>
        </div>
      </div>

      <GoogleCustomerMailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        moduleKey="demand"
        recordId={selectedDemand?.id ?? 0}
        customerId={selectedDemand?.potentialCustomerId}
        contactId={selectedDemand?.contactId}
        customerName={selectedDemand?.potentialCustomerName}
      />
    </>
  );
}
