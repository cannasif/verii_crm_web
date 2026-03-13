import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCreateRevisionOfDemand } from '../hooks/useCreateRevisionOfDemand';
import type { DemandGetDto } from '../types/demand-types';
import { Edit2, Mail, PencilLine } from 'lucide-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';
import { OutlookCustomerMailDialog } from '@/features/outlook-integration/components/OutlookCustomerMailDialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type DemandColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'PotentialCustomerName'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'Currency'
  | 'GrandTotal'
  | 'Status';

interface DemandTableProps {
  columns: DataTableGridColumn<DemandColumnKey>[];
  visibleColumnKeys: DemandColumnKey[];
  rows: DemandGetDto[];
  rowKey: (row: DemandGetDto) => string | number;
  renderCell: (row: DemandGetDto, columnKey: DemandColumnKey) => React.ReactNode;
  sortBy: DemandColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: DemandColumnKey) => void;
  renderSortIcon: (columnKey: DemandColumnKey) => React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: DemandGetDto) => string | undefined);
  onRowClick?: (row: DemandGetDto) => void;
  onRowDoubleClick?: (row: DemandGetDto) => void;
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

export function DemandTable({
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
  onRowDoubleClick,
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
}: DemandTableProps): ReactElement {
  const { t } = useTranslation(['demand', 'google-integration', 'outlook-integration']);
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfDemand();
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<DemandGetDto | null>(null);

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

  const handleOpenMailDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setSelectedDemand(demand);
    setMailDialogOpen(true);
  };

  const handleOpenOutlookMailDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setSelectedDemand(demand);
    setOutlookMailDialogOpen(true);
  };

  const renderActionsCell = (demand: DemandGetDto): ReactElement => (
    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        title={t('demand.list.detail', { defaultValue: 'Detay' })}
        onClick={() => navigate(`/demands/${demand.id}`)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('google-integration:mailDialog.openButton')}
        onClick={(e) => handleOpenMailDialog(e, demand)}
        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
      >
        <Mail className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('outlook-integration:mailDialog.openButton')}
        onClick={(e) => handleOpenOutlookMailDialog(e, demand)}
        className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
      >
        <Mail className="h-4 w-4" />
      </Button>
      {(demand.status === 0 || demand.status === 1) && (
        <Button
          variant="ghost"
          size="icon"
          title={t('demand.list.revise')}
          onClick={(e) => handleRevision(e, demand.id)}
          disabled={createRevisionMutation.isPending}
          className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
        >
          <PencilLine className={createRevisionMutation.isPending ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <DataTableGrid<DemandGetDto, DemandColumnKey>
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
        onRowDoubleClick={onRowDoubleClick}
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
        moduleKey="demand"
        recordId={selectedDemand?.id ?? 0}
        customerId={selectedDemand?.potentialCustomerId}
        contactId={selectedDemand?.contactId}
        customerName={selectedDemand?.potentialCustomerName}
      />
      <OutlookCustomerMailDialog
        open={outlookMailDialogOpen}
        onOpenChange={setOutlookMailDialogOpen}
        moduleKey="demand"
        recordId={selectedDemand?.id ?? 0}
        customerId={selectedDemand?.potentialCustomerId}
        contactId={selectedDemand?.contactId}
        customerName={selectedDemand?.potentialCustomerName}
      />
    </>
  );
}
