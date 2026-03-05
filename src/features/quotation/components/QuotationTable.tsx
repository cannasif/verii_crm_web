import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCreateRevisionOfQuotation } from '../hooks/useCreateRevisionOfQuotation';
import type { QuotationGetDto } from '../types/quotation-types';
import { Mail } from 'lucide-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type QuotationColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'PotentialCustomerName'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'Currency'
  | 'GrandTotal'
  | 'Status';

interface QuotationTableProps {
  columns: DataTableGridColumn<QuotationColumnKey>[];
  visibleColumnKeys: QuotationColumnKey[];
  rows: QuotationGetDto[];
  rowKey: (row: QuotationGetDto) => string | number;
  renderCell: (row: QuotationGetDto, columnKey: QuotationColumnKey) => React.ReactNode;
  sortBy: QuotationColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: QuotationColumnKey) => void;
  renderSortIcon: (columnKey: QuotationColumnKey) => React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: QuotationGetDto) => string | undefined);
  onRowClick?: (row: QuotationGetDto) => void;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  previousLabel: string;
  nextLabel: string;
  paginationInfoText: string;
  disablePaginationButtons?: boolean;
}

export function QuotationTable({
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  isLoading = false,
  isError = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[920px] lg:min-w-[1100px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  rowClassName,
  onRowClick,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  pageNumber,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousLabel,
  nextLabel,
  paginationInfoText,
  disablePaginationButtons = false,
}: QuotationTableProps): ReactElement {
  const { t } = useTranslation(['quotation', 'google-integration']);
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfQuotation();
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationGetDto | null>(null);

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

  const handleOpenMailDialog = (event: React.MouseEvent, quotation: QuotationGetDto): void => {
    event.stopPropagation();
    setSelectedQuotation(quotation);
    setMailDialogOpen(true);
  };

  const renderActionsCell = (quotation: QuotationGetDto): ReactElement => (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" onClick={(e) => handleOpenMailDialog(e, quotation)}>
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
          {createRevisionMutation.isPending ? t('quotation.loading') : t('quotation.list.revise')}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <DataTableGrid<QuotationGetDto, QuotationColumnKey>
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        rows={rows}
        rowKey={rowKey}
        renderCell={renderCell}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={onSort}
        renderSortIcon={renderSortIcon}
        isLoading={isLoading}
        isError={isError}
        loadingText={loadingText}
        errorText={errorText}
        emptyText={emptyText}
        minTableWidthClassName={minTableWidthClassName}
        showActionsColumn={showActionsColumn}
        actionsHeaderLabel={actionsHeaderLabel}
        renderActionsCell={renderActionsCell}
        rowClassName={rowClassName}
        onRowClick={onRowClick}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        totalPages={totalPages}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        paginationInfoText={paginationInfoText}
        disablePaginationButtons={disablePaginationButtons}
      />
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
