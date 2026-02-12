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
  DialogHeader,
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
import { PricingRuleType, type PricingRuleHeaderGetDto } from '../types/pricing-rule-types';
import { useDeletePricingRuleHeader } from '../hooks/useDeletePricingRuleHeader';
import { toast } from 'sonner';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Building2,
  EyeOff,
  ChevronDown,
  List,
  FileText,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'status';
  label: string;
  type: 'text' | 'date' | 'customer' | 'ruleType' | 'status' | 'code';
  className?: string;
}

interface PricingRuleTableProps {
  headers: PricingRuleHeaderGetDto[];
  isLoading: boolean;
  onEdit: (header: PricingRuleHeaderGetDto) => void;
}

const getColumnsConfig = (t: TFunction): ColumnDef<PricingRuleHeaderGetDto>[] => [
    { key: 'ruleCode', label: t('pricingRule.table.ruleCode'), type: 'code', className: 'w-[96px] md:w-[120px]' },
    { key: 'ruleName', label: t('pricingRule.table.ruleName'), type: 'text', className: 'min-w-[160px] md:min-w-[200px] font-medium' },
    { key: 'ruleType', label: t('pricingRule.table.ruleType'), type: 'ruleType', className: 'w-[110px] md:w-[140px]' },
    { key: 'validFrom', label: t('pricingRule.table.validFrom'), type: 'date', className: 'w-[110px] md:w-[140px]' },
    { key: 'validTo', label: t('pricingRule.table.validTo'), type: 'date', className: 'w-[110px] md:w-[140px]' },
    { key: 'customerName', label: t('pricingRule.table.customer'), type: 'customer', className: 'min-w-[150px] md:min-w-[180px]' },
    { key: 'isActive', label: t('pricingRule.table.status'), type: 'status', className: 'w-[96px] md:w-[120px]' },
];

export function PricingRuleTable({
  headers,
  isLoading,
  onEdit,
}: PricingRuleTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHeader, setSelectedHeader] = useState<PricingRuleHeaderGetDto | null>(null);
  const deleteHeader = useDeletePricingRuleHeader();
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [sortConfig, setSortConfig] = useState<{ key: keyof PricingRuleHeaderGetDto | 'status'; direction: 'asc' | 'desc' } | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof PricingRuleHeaderGetDto | 'status'>>(
    tableColumns.map(col => col.key)
  );

  const processedHeaders = useMemo(() => {
    const result = [...headers];

	    if (sortConfig) {
	      result.sort((a, b) => {
	        const key = String(sortConfig.key);
	        const aRaw = (a as unknown as Record<string, unknown>)[key];
	        const bRaw = (b as unknown as Record<string, unknown>)[key];
	        const aValue = aRaw != null ? String(aRaw).toLowerCase() : '';
	        const bValue = bRaw != null ? String(bRaw).toLowerCase() : '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [headers, sortConfig]);

  const totalPages = Math.ceil(processedHeaders.length / pageSize);
  const paginatedHeaders = processedHeaders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (header: PricingRuleHeaderGetDto): void => {
    setSelectedHeader(header);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedHeader) {
      try {
        await deleteHeader.mutateAsync(selectedHeader.id);
        toast.success(t('pricingRule.delete.success'));
        setDeleteDialogOpen(false);
        setSelectedHeader(null);
      } catch {
        toast.error(t('pricingRule.delete.error'));
      }
    }
  };

  const handleSort = (key: keyof PricingRuleHeaderGetDto | 'status') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumn = (key: keyof PricingRuleHeaderGetDto | 'status') => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const getRuleTypeConfig = (type: PricingRuleType) => {
    switch (type) {
      case PricingRuleType.Demand:
        return { 
          label: t('pricingRule.ruleType.demand'), 
          className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
          icon: List
        };
      case PricingRuleType.Quotation:
        return { 
          label: t('pricingRule.ruleType.quotation'), 
          className: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
          icon: FileText
        };
      case PricingRuleType.Order:
        return { 
          label: t('pricingRule.ruleType.order'), 
          className: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
          icon: ShoppingCart
        };
      default:
        return { 
          label: t('pricingRule.ruleType.unknown'), 
          className: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
          icon: TrendingUp
        };
    }
  };

	  const renderCellContent = (item: PricingRuleHeaderGetDto, column: ColumnDef<PricingRuleHeaderGetDto>) => {
	    const value = (item as unknown as Record<string, unknown>)[String(column.key)];
    
    if (column.key === 'isActive') {
        const now = new Date();
        const from = new Date(item.validFrom);
        const to = new Date(item.validTo);
        const isRuleValid = item.isActive && from <= now && to >= now;
        
        return (
            <Badge 
                variant="outline" 
                className={`gap-1.5 pl-1.5 pr-2.5 py-0.5 border ${
                    isRuleValid 
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                }`}
            >
                {isRuleValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {isRuleValid ? t('pricingRule.status.active') : t('pricingRule.status.inactive')}
            </Badge>
        );
    }

    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'code':
            return <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">{String(value)}</span>;
        case 'ruleType': {
            const ruleTypeConfig = getRuleTypeConfig(value as PricingRuleType);
            const RuleIcon = ruleTypeConfig.icon;
            return (
                <Badge variant="outline" className={`gap-1.5 pl-2 pr-2.5 py-0.5 ${ruleTypeConfig.className}`}>
                    <RuleIcon size={12} />
                    {ruleTypeConfig.label}
                </Badge>
            );
        }
        case 'customer':
            return (
                <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[150px]" title={String(value)}>
                        {String(value)}
                    </span>
                </div>
            );
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-slate-400" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
        default:
            return String(value);
    }
  };

  const SortIcon = ({ column }: { column: keyof PricingRuleHeaderGetDto | 'status' }): ReactElement => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    ) : (
      <ArrowDown size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('pricingRule.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (headers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('pricingRule.noData')}
        </div>
      </div>
    );
  }

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

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
                        {t('common.editColumns')}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                    align="end" 
                    className="w-56 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-50"
                >
                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5">
                        {t('common.visibleColumns')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10 my-1" />
                    
                    {tableColumns.map((col) => (
                        <DropdownMenuCheckboxItem
                            key={col.key}
                            checked={visibleColumns.includes(col.key)}
                            onSelect={(e) => e.preventDefault()} 
                            onCheckedChange={() => toggleColumn(col.key)}
                            className="text-sm text-slate-700 dark:text-slate-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
                        >
                            {col.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <div className="overflow-x-auto">
        <Table className="min-w-[900px] lg:min-w-[1100px]">
            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                {tableColumns.filter(col => visibleColumns.includes(col.key)).map((col) => (
                    <TableHead 
                        key={col.key} 
                        onClick={() => handleSort(col.key)} 
                        className={headStyle}
                    >
                        <div className="flex items-center gap-2">
                            {col.label}
                            <SortIcon column={col.key} />
                        </div>
                    </TableHead>
                ))}
                <TableHead className={`${headStyle} text-right w-[84px] md:w-[100px]`}>
                  {t('pricingRule.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHeaders.map((header: PricingRuleHeaderGetDto, index: number) => (
                <TableRow 
                  key={header.id || `header-${index}`}
                  className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
                >
                  {tableColumns.filter(col => visibleColumns.includes(col.key)).map((col) => (
                      <TableCell key={`${header.id}-${col.key}`} className={`${cellStyle} ${col.className || ''}`}>
                          {renderCellContent(header, col)}
                      </TableCell>
                  ))}

                  <TableCell className={`${cellStyle} text-right`}>
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10" onClick={() => onEdit(header)}><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => handleDeleteClick(header)}><Trash2 size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('pricingRule.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedHeaders.length),
            total: processedHeaders.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('pricingRule.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('pricingRule.table.page', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('pricingRule.next')}</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('pricingRule.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('pricingRule.delete.confirmMessage', {
                    name: selectedHeader?.ruleName || '',
                })}
                </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('pricingRule.cancel')}
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteHeader.isPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteHeader.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('pricingRule.delete.action')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
