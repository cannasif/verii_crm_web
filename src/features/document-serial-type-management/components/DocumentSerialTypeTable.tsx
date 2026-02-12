import { type ReactElement, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentSerialTypeList } from '../hooks/useDocumentSerialTypeList';
import { useDeleteDocumentSerialType } from '../hooks/useDeleteDocumentSerialType';
import type { DocumentSerialTypeDto } from '../types/document-serial-type-types';
import type { PagedFilter } from '@/types/api';
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, Trash2, FileText } from 'lucide-react';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

interface DocumentSerialTypeTableProps {
  onEdit: (documentSerialType: DocumentSerialTypeDto) => void;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function DocumentSerialTypeTable({
  onEdit,
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
}: DocumentSerialTypeTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocumentSerialType, setSelectedDocumentSerialType] = useState<DocumentSerialTypeDto | null>(null);

  const { data, isLoading, isFetching } = useDocumentSerialTypeList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const deleteDocumentSerialType = useDeleteDocumentSerialType();

  const handleDeleteClick = (documentSerialType: DocumentSerialTypeDto): void => {
    setSelectedDocumentSerialType(documentSerialType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedDocumentSerialType) {
      await deleteDocumentSerialType.mutateAsync(selectedDocumentSerialType.id);
      setDeleteDialogOpen(false);
      setSelectedDocumentSerialType(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-2 w-3 h-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" /> : 
      <ChevronDown className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />;
  };

  const getRuleTypeLabel = (type: PricingRuleType): string => {
    const labels: Record<PricingRuleType, string> = {
      [PricingRuleType.Demand]: t('pricingRule.ruleType.demand'),
      [PricingRuleType.Quotation]: t('pricingRule.ruleType.quotation'),
      [PricingRuleType.Order]: t('pricingRule.ruleType.order'),
    };
    return labels[type] || t('pricingRule.ruleType.unknown');
  };

  const borderClass = "border-zinc-300 dark:border-zinc-700/80"; 

  if (isLoading || isFetching) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 gap-4 border ${borderClass} rounded-xl bg-white/50 dark:bg-card/50`}>
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">{t('documentSerialTypeManagement.loading')}</span>
      </div>
    );
  }

  const documentSerialTypes = data?.data || [];
  
  if (!data || documentSerialTypes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 text-muted-foreground border ${borderClass} border-dashed rounded-xl bg-white/50 dark:bg-card/50`}>
        <FileText size={40} className="opacity-40 mb-2" />
        <p className="text-sm font-medium">{t('documentSerialTypeManagement.noData')}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  return (
    <div className="w-full">
      <Table className="border-collapse w-full">
        <TableHeader className="bg-zinc-200 dark:bg-muted/20">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700 last:border-r-0`}
              onClick={() => handleSort('Id')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.id')} <SortIcon column="Id" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700 last:border-r-0`}
              onClick={() => handleSort('RuleType')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.ruleType')} <SortIcon column="RuleType" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('CustomerTypeName')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.customerType')} <SortIcon column="CustomerTypeName" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('SalesRepFullName')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.salesRep')} <SortIcon column="SalesRepFullName" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('SerialPrefix')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.serialPrefix')} <SortIcon column="SerialPrefix" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('SerialLength')}
            >
              <div className="flex items-center gap-1">
                {t('documentSerialTypeManagement.table.serialLength')} <SortIcon column="SerialLength" />
              </div>
            </TableHead>
            <TableHead className={`py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-r border-zinc-300 dark:border-zinc-700`}>
              {t('documentSerialTypeManagement.table.createdDate')}
            </TableHead>
            <TableHead className={`text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-zinc-300 dark:border-zinc-700`}>
              {t('documentSerialTypeManagement.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentSerialTypes.map((documentSerialType: DocumentSerialTypeDto, index: number) => (
            <TableRow 
              key={documentSerialType.id || `document-serial-type-${index}`}
              className={`group cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors duration-200 bg-white dark:bg-transparent`}
            >
              <TableCell className={`font-mono text-xs text-muted-foreground border-b border-r ${borderClass} px-4 py-3`}>
                {documentSerialType.id}
              </TableCell>
              <TableCell className={`font-semibold text-sm text-foreground/90 border-b border-r ${borderClass} px-4 py-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors`}>
                {getRuleTypeLabel(documentSerialType.ruleType)}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {documentSerialType.customerTypeName || '-'}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {documentSerialType.salesRepFullName || '-'}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {documentSerialType.serialPrefix || '-'}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {documentSerialType.serialLength || '-'}
              </TableCell>
              <TableCell className={`text-sm text-muted-foreground border-b border-r ${borderClass} px-4 py-3`}>
                 {documentSerialType.createdDate ? new Date(documentSerialType.createdDate).toLocaleDateString(i18n.language) : '-'}
              </TableCell>
              <TableCell className={`text-right border-b ${borderClass} px-4 py-3`}>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(documentSerialType)}
                    className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(documentSerialType)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className={`flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-zinc-50/50 dark:bg-muted/20 border-t-0 rounded-b-xl gap-4 border-x border-b ${borderClass}`}>
        <div className="text-xs text-muted-foreground font-medium">
            {t('documentSerialTypeManagement.totalRecords', { count: data?.totalCount || 0 })}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-background hover:bg-pink-50 hover:border-pink-500 hover:text-pink-600 transition-all ${borderClass}`}
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            {t('documentSerialTypeManagement.previous')}
          </Button>
          
          <div className={`text-xs font-bold bg-white dark:bg-background px-3 py-1.5 rounded-md min-w-[3rem] text-center border ${borderClass}`}>
            {pageNumber} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-background hover:bg-pink-50 hover:border-pink-500 hover:text-pink-600 transition-all ${borderClass}`}
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('documentSerialTypeManagement.next')}
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
           <DialogHeader className="space-y-4">
             <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-2">
               <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
             </div>
             <DialogTitle className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
               {t('documentSerialTypeManagement.deleteConfirmTitle')}
             </DialogTitle>
             <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
               {t('documentSerialTypeManagement.deleteConfirmDescription')}
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
             <Button
               variant="outline"
               onClick={() => setDeleteDialogOpen(false)}
               className="flex-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
             >
               {t('documentSerialTypeManagement.cancel')}
             </Button>
             <Button
               variant="destructive"
               onClick={handleDeleteConfirm}
               disabled={deleteDocumentSerialType.isPending}
               className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
             >
               {deleteDocumentSerialType.isPending ? t('documentSerialTypeManagement.deleting') : t('documentSerialTypeManagement.delete')}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
