import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
} from 'lucide-react';
import type { ErpCustomer } from '../types/erp-customer-types';

interface ErpCustomerTableProps {
  customers: ErpCustomer[];
  isLoading: boolean;
  visibleColumns: string[];
  sortConfig: { key: keyof ErpCustomer; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof ErpCustomer) => void;
  onRowClick?: (customer: ErpCustomer) => void;
}

export const getColumnsConfig = (t: TFunction) => [
    { key: 'branchCode', label: t('table.branchCode'), className: 'font-medium whitespace-nowrap' },
    { key: 'businessUnit', label: t('table.businessUnitCode'), className: 'whitespace-nowrap' },
    { key: 'customerCode', label: t('table.customerCode'), className: 'font-semibold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors whitespace-nowrap' },
    { key: 'customerName', label: t('table.customerName'), className: 'text-slate-800 dark:text-slate-200 font-medium min-w-[160px] md:min-w-[200px]' },
    { key: 'phone', label: t('table.phone'), className: 'whitespace-nowrap' },
    { key: 'email', label: t('table.email'), className: 'min-w-[160px] md:min-w-[200px] break-all' },
    { key: 'city', label: t('table.city'), className: 'whitespace-nowrap' },
    { key: 'district', label: t('table.district'), className: 'whitespace-nowrap' },
    { key: 'address', label: t('table.address'), className: 'min-w-[220px] md:min-w-[300px] leading-relaxed' },
    { key: 'countryCode', label: t('table.countryCode'), className: '' },
    { key: 'website', label: t('table.website'), className: 'text-blue-500 hover:underline min-w-[120px] md:min-w-[150px] break-all', isLink: true },
    { key: 'taxNumber', label: t('table.taxNumber'), className: 'font-mono text-xs whitespace-nowrap' },
    { key: 'taxOffice', label: t('table.taxOffice'), className: 'whitespace-nowrap' },
    { key: 'tckn', label: t('table.tcknNumber'), className: 'font-mono text-xs whitespace-nowrap' },
];

export function ErpCustomerTable({ customers, isLoading, visibleColumns, sortConfig, onSort, onRowClick }: ErpCustomerTableProps): ReactElement {
  const { t } = useTranslation('erp-customer-management');
  
  const allColumns = getColumnsConfig(t);

  const headStyle = `
    text-slate-500 dark:text-slate-400 
    font-bold text-xs uppercase tracking-wider 
    py-2 px-4 
    hover:text-pink-600 dark:hover:text-pink-400 
    transition-colors cursor-pointer select-none
    border-r border-slate-200 dark:border-white/[0.03] last:border-r-0
    whitespace-nowrap bg-slate-50/90 dark:bg-[#130822]/90
    text-left
  `;

  const cellStyle = `
    text-slate-600 dark:text-slate-400 
    px-4 py-2
    border-r border-slate-100 dark:border-white/[0.03] last:border-r-0
    text-sm align-middle
  `;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 h-full">
        <div className="flex flex-col items-center gap-3">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <span className="text-sm font-medium text-muted-foreground animate-pulse">
             {t('loading')}
           </span>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 h-full">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('noData')}
        </div>
      </div>
    );
  }

  return (
    <table className="w-full min-w-[680px] sm:min-w-[820px] lg:min-w-[1100px] caption-bottom text-sm relative">
        <TableHeader className="bg-[#151025] sticky top-0 z-10 shadow-sm">
            <TableRow className="h-10 hover:bg-transparent border-b border-slate-200 dark:border-white/10">
                {allColumns.filter(col => visibleColumns.includes(col.key)).map((col) => (
                    <TableHead 
                        key={col.key} 
                        className={headStyle}
                        onClick={() => onSort(col.key as keyof ErpCustomer)}
                    >
                        <div className="flex items-center gap-2">
                            {col.label}
                            {sortConfig?.key === col.key ? (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-pink-500" /> : <ArrowDown size={14} className="text-pink-500" />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100" />
                            )}
                        </div>
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
        <TableBody>
            {customers.map((customer, index) => (
            <TableRow 
                key={`${customer.customerCode}-${index}`}
                className={`h-10 border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(customer)}
            >
                {allColumns.filter(col => visibleColumns.includes(col.key)).map((col) => {
                    const cellKey = col.key as keyof ErpCustomer;
                    return (
                        <TableCell key={col.key} className={`${cellStyle} ${col.className}`}>
                            {col.isLink && customer[cellKey] ? (
                                <a href={String(customer[cellKey])} target="_blank" rel="noreferrer">{customer[cellKey]}</a>
                            ) : (
                                customer[cellKey] || '-'
                            )}
                        </TableCell>
                    );
                })}
            </TableRow>
            ))}
        </TableBody>
    </table>
  );
}
