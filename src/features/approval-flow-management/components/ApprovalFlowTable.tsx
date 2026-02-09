import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useDeleteApprovalFlow } from '../hooks/useDeleteApprovalFlow';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import { 
    Edit2, 
    Trash2, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown,
    EyeOff
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

interface ApprovalFlowTableProps {
  approvalFlows: ApprovalFlowDto[];
  isLoading: boolean;
  onEdit: (approvalFlow: ApprovalFlowDto) => void;
}

export function ApprovalFlowTable({
  approvalFlows,
  isLoading,
  onEdit,
}: ApprovalFlowTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApprovalFlow, setSelectedApprovalFlow] = useState<ApprovalFlowDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApprovalFlowDto; direction: 'asc' | 'desc' } | null>(null);

  const deleteApprovalFlow = useDeleteApprovalFlow();

  const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalFlowDto>[] => [
    { key: 'id', label: t('approvalFlow.table.id', 'ID'), className: 'w-[100px]' },
    { key: 'documentType', label: t('approvalFlow.table.documentType', 'Belge Tipi'), className: 'min-w-[150px]' },
    { key: 'description', label: t('approvalFlow.table.description', 'Açıklama'), className: 'min-w-[200px]' },
    { key: 'isActive', label: t('approvalFlow.table.isActive', 'Durum'), className: 'w-[120px]' },
    { key: 'createdDate', label: t('approvalFlow.table.createdDate', 'Oluşturulma Tarihi'), className: 'w-[160px]' },
    { key: 'createdByFullUser', label: t('approvalFlow.table.createdBy', 'Oluşturan'), className: 'w-[160px]' },
  ];

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  
  type ColumnKey = keyof ApprovalFlowDto | 'actions';
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    [...tableColumns.map(col => col.key), 'actions']
  );

  const processedApprovalFlows = useMemo(() => {
    const result = [...approvalFlows];

    if (sortConfig) {
      result.sort((a, b) => {
        const aRaw = a[sortConfig.key];
        const bRaw = b[sortConfig.key];
        const aValue = aRaw != null ? String(aRaw).toLowerCase() : '';
        const bValue = bRaw != null ? String(bRaw).toLowerCase() : '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [approvalFlows, sortConfig]);

  const totalPages = Math.ceil(processedApprovalFlows.length / pageSize);
  const paginatedApprovalFlows = processedApprovalFlows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (approvalFlow: ApprovalFlowDto): void => {
    setSelectedApprovalFlow(approvalFlow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedApprovalFlow) {
      await deleteApprovalFlow.mutateAsync(selectedApprovalFlow.id);
      setDeleteDialogOpen(false);
      setSelectedApprovalFlow(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortConfig?.key === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: column as keyof ApprovalFlowDto, direction: newDirection });
  };

  const getDocumentTypeLabel = (type: number): string => {
    switch (type) {
      case 1:
        return t('approvalFlow.documentType.demand', 'Talep');
      case 2:
        return t('approvalFlow.documentType.quotation', 'Teklif');
      case 3:
        return t('approvalFlow.documentType.order', 'Sipariş');
      default:
        return '-';
    }
  };

  const toggleColumn = (key: keyof ApprovalFlowDto | 'actions') => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    ) : (
      <ArrowDown size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    );
  };

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('common.loading', 'Yükleniyor...')}
           </div>
        </div>
      </div>
    );
  }

  if (approvalFlows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('approvalFlow.noData', 'Kayıt Bulunamadı')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end p-2 sm:p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto h-9 lg:flex border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {t('common.editColumns', 'Sütunları Düzenle')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-50"
          >
            <DropdownMenuLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5">
                {t('common.visibleColumns', 'Görünür Sütunlar')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10 my-1" />
            {tableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
                onSelect={(e) => e.preventDefault()}
                className="text-sm text-slate-700 dark:text-slate-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              {tableColumns.map((column) => (
                visibleColumns.includes(column.key) && (
                    <TableHead
                        key={column.key}
                        className={`${headStyle} ${column.className}`}
                        onClick={() => handleSort(column.key as string)}
                    >
                        <div className="flex items-center gap-1 group">
                        {column.label}
                        <SortIcon column={column.key as string} />
                        </div>
                    </TableHead>
                )
              ))}
              <TableHead className={`${headStyle} text-right w-[100px]`}>
                {t('approvalFlow.table.actions', 'İşlemler')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedApprovalFlows.map((approvalFlow) => (
              <TableRow 
                key={approvalFlow.id}
                className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group"
              >
                {visibleColumns.includes('id') && (
                    <TableCell className={cellStyle}>
                        <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                            #{approvalFlow.id}
                        </span>
                    </TableCell>
                )}
                {visibleColumns.includes('documentType') && (
                    <TableCell className={`${cellStyle} font-medium text-slate-900 dark:text-white`}>
                        {getDocumentTypeLabel(approvalFlow.documentType)}
                    </TableCell>
                )}
                {visibleColumns.includes('description') && (
                    <TableCell className={cellStyle}>
                        {approvalFlow.description || '-'}
                    </TableCell>
                )}
                {visibleColumns.includes('isActive') && (
                    <TableCell className={cellStyle}>
                        <Badge 
                            variant={approvalFlow.isActive ? 'default' : 'secondary'}
                            className={`${approvalFlow.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30'} border shadow-sm`}
                        >
                            {approvalFlow.isActive
                            ? t('approvalFlow.active', 'Aktif')
                            : t('approvalFlow.inactive', 'Pasif')}
                        </Badge>
                    </TableCell>
                )}
                {visibleColumns.includes('createdDate') && (
                    <TableCell className={cellStyle}>
                        {new Date(approvalFlow.createdDate).toLocaleDateString(i18n.language)}
                    </TableCell>
                )}
                {visibleColumns.includes('createdByFullUser') && (
                    <TableCell className={cellStyle}>
                        {approvalFlow.createdByFullUser || '-'}
                    </TableCell>
                )}
                
                <TableCell className={`${cellStyle} text-right`}>
                  <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(approvalFlow)}
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                      title={t('common.edit', 'Düzenle')}
                    >
                      <Edit2 size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(approvalFlow)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                      title={t('common.delete', 'Sil')}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
            {t('common.showing', 'Gösterilen')}: <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, processedApprovalFlows.length)}</span> / <span className="font-medium text-slate-900 dark:text-white">{processedApprovalFlows.length}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                    .map((page, i, arr) => (
                        <>
                            {i > 0 && arr[i - 1] !== page - 1 && (
                                <span key={`dots-${i}`} className="px-1 text-slate-400">...</span>
                            )}
                            <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-pink-600 hover:bg-pink-700 text-white' : ''}`}
                            >
                                {page}
                            </Button>
                        </>
                    ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
            >
                <ChevronRight size={16} />
            </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[400px] p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 overflow-hidden rounded-2xl">
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
               <Alert02Icon size={32} />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {t('approvalFlow.delete.title', 'Onay Akışını Sil')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                {t('approvalFlow.delete.confirm', 'Bu onay akışını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')}
              </DialogDescription>
            </div>

            {selectedApprovalFlow && (
              <div className="w-full bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {getDocumentTypeLabel(selectedApprovalFlow.documentType)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {selectedApprovalFlow.description || '-'}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex gap-3">
             <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-11 rounded-xl border-slate-200 dark:border-white/10"
            >
              {t('common.cancel', 'Vazgeç')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            >
              {t('common.delete', 'Sil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
