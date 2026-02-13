import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Filter,
  FileSpreadsheet,
  FileText,
  Presentation,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { PaymentTypeTable, getColumnsConfig } from './PaymentTypeTable';
import { PaymentTypeForm } from './PaymentTypeForm';
import { useCreatePaymentType } from '../hooks/useCreatePaymentType';
import { useUpdatePaymentType } from '../hooks/useUpdatePaymentType';
import { usePaymentTypeList } from '../hooks/usePaymentTypeList';
import type { PaymentTypeDto } from '../types/payment-type-types';
import type { PaymentTypeFormSchema } from '../types/payment-type-types';
import { useQueryClient } from '@tanstack/react-query';
import { PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { applyPaymentTypeFilters, PAYMENT_TYPE_FILTER_COLUMNS } from '../types/payment-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export function PaymentTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentTypeDto | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createPaymentType = useCreatePaymentType();
  const updatePaymentType = useUpdatePaymentType();
  const queryClient = useQueryClient();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof PaymentTypeDto | 'status'>>(
    () => defaultColumnKeys as Array<keyof PaymentTypeDto | 'status'>
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('payment-type-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys as Array<keyof PaymentTypeDto | 'status'>);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data, isLoading } = usePaymentTypeList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const allPaymentTypes = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  const filteredPaymentTypes = useMemo(() => {
    let result: PaymentTypeDto[] = [...allPaymentTypes];

    // Quick Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(lowerTerm) ||
          d.description?.toLowerCase().includes(lowerTerm)
      );
    }

    result = applyPaymentTypeFilters(result, appliedFilterRows);

    return result;
  }, [allPaymentTypes, searchTerm, appliedFilterRows]);

  useEffect(() => {
    setPageTitle(t('paymentTypeManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return tableColumns
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key as string) ?? 999) - (orderMap.get(b.key as string) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

  const handleExportExcel = async () => {
    const dataToExport = filteredPaymentTypes.map((item) => {
      const row: Record<string, string | number | boolean | null | undefined> = {};
      displayedColumnsForExport.forEach((col) => {
        const value = item[col.key as keyof PaymentTypeDto];
        row[col.label] =
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? value
            : value ?? '';
      });
      return row;
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PaymentTypes");
    XLSX.writeFile(wb, "payment-types.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumn = displayedColumnsForExport.map((col) => col.label);
    const tableRows = filteredPaymentTypes.map((item) =>
      displayedColumnsForExport.map((col) => item[col.key as keyof PaymentTypeDto] ?? '')
    );

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("payment-types.pdf");
  };

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    slide.addText("Payment Types Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = filteredPaymentTypes.map((item) =>
      displayedColumnsForExport.map((col) =>
        String(item[col.key as keyof PaymentTypeDto] ?? '')
      )
    );

    const tableData = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "payment-types.pptx" });
  };

  const handleAddClick = (): void => {
    setEditingPaymentType(null);
    setFormOpen(true);
  };

  const handleEdit = (paymentType: PaymentTypeDto): void => {
    setEditingPaymentType(paymentType);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: PaymentTypeFormSchema): Promise<void> => {
    if (editingPaymentType) {
      await updatePaymentType.mutateAsync({
        id: editingPaymentType.id,
        data: {
          name: data.name,
          description: data.description || undefined,
        },
      });
    } else {
      await createPaymentType.mutateAsync({
        name: data.name,
        description: data.description || undefined,
      });
    }
    setFormOpen(false);
    setEditingPaymentType(null);
  };

  return (
    <div className="w-full space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('paymentTypeManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('paymentTypeManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('paymentTypeManagement.create')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('common.search')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <div className="flex items-center gap-2">
              <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white"
                        >
                            <span className="font-medium text-sm">{pageSize}</span>
                            <ChevronDown size={16} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-20 bg-[#151025] border border-white/10 shadow-2xl rounded-xl overflow-hidden p-1">
                        {[10, 20, 50].map((size) => (
                            <DropdownMenuItem 
                                key={size} 
                                onClick={() => setPageSize(size)}
                                className={`flex items-center justify-center text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${pageSize === size ? 'bg-pink-500/10 text-pink-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {size}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasFiltersActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                      hasFiltersActive
                        ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {t('common.filters')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                  <AdvancedFilter
                    columns={PAYMENT_TYPE_FILTER_COLUMNS}
                    defaultColumn="name"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="paymentTypeManagement"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="payment-type-management"
                userId={user?.id}
                columns={tableColumns.map((c) => ({ key: c.key as string, label: c.label }))}
                visibleColumns={visibleColumns.map(String)}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next as Array<keyof PaymentTypeDto | 'status'>);
                  saveColumnPreferences('payment-type-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next.map(String),
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('payment-type-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns.map(String),
                  });
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white">
                    <Menu size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.actions')}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 my-1"></div>

                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.export')}
                    </div>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                      <span>{t('common.exportExcel')}</span>
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <FileText size={16} className="text-red-400" />
                      <span>{t('common.exportPDF')}</span>
                    </button>
                    <button onClick={handleExportPowerPoint} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <Presentation size={16} className="text-orange-400" />
                      <span>{t('common.exportPPT')}</span>
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <PaymentTypeTable
          paymentTypes={filteredPaymentTypes}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          pageSize={pageSize}
          columnOrder={columnOrder}
          onColumnOrderChange={(next) => {
            setColumnOrder(next);
            saveColumnPreferences('payment-type-management', user?.id, {
              order: next,
              visibleKeys: visibleColumns.map(String),
            });
          }}
        />
      </div>

      <PaymentTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        paymentType={editingPaymentType}
        isLoading={createPaymentType.isPending || updatePaymentType.isPending}
      />
    </div>
  );
}
