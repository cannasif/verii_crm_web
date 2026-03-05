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
import { useQuotationList } from '../hooks/useQuotationList';
import { useCreateRevisionOfQuotation } from '../hooks/useCreateRevisionOfQuotation';
import type { QuotationGetDto } from '../types/quotation-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ChevronUp, ChevronDown, ChevronsUpDown, Mail } from 'lucide-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';

interface QuotationTableProps {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onRowClick: (quotationId: number) => void;
}

export function QuotationTable({
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
  onRowClick,
}: QuotationTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfQuotation();
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationGetDto | null>(null);

  const { data, isLoading, isFetching } = useQuotationList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const handleRevision = async (e: React.MouseEvent, quotationId: number): Promise<void> => {
    e.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(quotationId);
      if (result.success && result.data?.id) {
        navigate(`/quotations/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleSort = (column: string): void => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const handleOpenMailDialog = (event: React.MouseEvent, quotation: QuotationGetDto): void => {
    event.stopPropagation();
    setSelectedQuotation(quotation);
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
          {t('quotation.loading')}
        </span>
      </div>
    );
  }

  const quotations = data?.data || [];

  if (!data || quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border border-zinc-300 dark:border-zinc-700/80 border-dashed rounded-xl bg-white/50 dark:bg-card/50">
        <p className="text-sm font-medium">{t('quotation.noData')}</p>
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
                  {t('quotation.list.id')}
                  <SortIcon column="Id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferNo')}
              >
                <div className="flex items-center">
                  {t('quotation.list.offerNo')}
                  <SortIcon column="OfferNo" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('PotentialCustomerName')}
              >
                <div className="flex items-center">
                  {t('quotation.list.customer')}
                  <SortIcon column="PotentialCustomerName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('RepresentativeName')}
              >
                <div className="flex items-center">
                  {t('quotation.list.representative')}
                  <SortIcon column="RepresentativeName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferDate')}
              >
                <div className="flex items-center">
                  {t('quotation.list.offerDate')}
                  <SortIcon column="OfferDate" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Currency')}
              >
                <div className="flex items-center">
                  {t('quotation.list.currency')}
                  <SortIcon column="Currency" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('GrandTotal')}
              >
                <div className="flex items-center justify-end">
                  {t('quotation.list.grandTotal')}
                  <SortIcon column="GrandTotal" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Status')}
              >
                <div className="flex items-center">
                  {t('quotation.list.status')}
                  <SortIcon column="Status" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                {t('quotation.list.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((quotation: QuotationGetDto) => (
              <TableRow
                key={quotation.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(quotation.id)}
              >
                <TableCell className="font-medium">{quotation.id}</TableCell>
                <TableCell>{quotation.offerNo || '-'}</TableCell>
                <TableCell>{quotation.potentialCustomerName || '-'}</TableCell>
                <TableCell>{quotation.representativeName || '-'}</TableCell>
                <TableCell>{formatDate(quotation.offerDate)}</TableCell>
                <TableCell>{quotation.currency || '-'}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(quotation.grandTotal, quotation.currency || 'TRY')}
                </TableCell>
                <TableCell>
                  {typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4 ? (
                    <ApprovalStatusBadge status={quotation.status as ApprovalStatus} />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleOpenMailDialog(e, quotation)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {t('google-integration:mailDialog.openButton')}
                    </Button>
                    {(quotation.status === 0 || quotation.status === 1) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRevision(e, quotation.id)}
                        disabled={createRevisionMutation.isPending}
                      >
                        {createRevisionMutation.isPending
                          ? t('quotation.loading')
                          : t('quotation.list.revise')}
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
          {t('quotation.list.showing', {
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
            {t('quotation.previous')}
          </Button>
          <div className="flex items-center px-4 text-sm">
            {t('quotation.list.page', {
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
            {t('quotation.next')}
          </Button>
        </div>
      </div>

      <GoogleCustomerMailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        moduleKey="quotation"
        recordId={selectedQuotation?.id ?? 0}
        customerId={selectedQuotation?.potentialCustomerId}
        contactId={selectedQuotation?.contactId}
        customerName={selectedQuotation?.potentialCustomerName}
      />
    </>
  );
}
