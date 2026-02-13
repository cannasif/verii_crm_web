import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { UserDiscountLimitTable, getColumnsConfig } from './UserDiscountLimitTable';
import { UserDiscountLimitForm } from './UserDiscountLimitForm';
import { UserDiscountLimitAdvancedFilter } from './UserDiscountLimitAdvancedFilter';
import { useCreateUserDiscountLimit } from '../hooks/useCreateUserDiscountLimit';
import { useUpdateUserDiscountLimit } from '../hooks/useUpdateUserDiscountLimit';
import { useUserDiscountLimits } from '../hooks/useUserDiscountLimits';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';
import { rowsToBackendFilters } from '../types/user-discount-limit-filter.types';
import type { UserDiscountLimitFilterRow } from '../types/user-discount-limit-filter.types';
import type { PagedFilter } from '@/types/api';
import {
  Plus,
  FileText,
  ChevronDown,
  X,
  Menu,
  FileSpreadsheet,
  Filter,
  Presentation,
} from 'lucide-react';
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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { PageToolbar } from '@/components/shared';
import { ColumnPreferencesPopover } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';

export function UserDiscountLimitManagementPage(): ReactElement {
  const { t } = useTranslation(['user-discount-limit-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserDiscountLimit, setEditingUserDiscountLimit] = useState<UserDiscountLimitDto | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<UserDiscountLimitFilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);

  const queryClient = useQueryClient();

  function buildSimpleFilters(searchTerm: string): PagedFilter[] {
    const out: PagedFilter[] = [];
    const trimmed = searchTerm.trim();
    if (trimmed) {
      out.push({ column: 'SalespersonName', operator: 'Contains', value: trimmed });
    }
    return out;
  }

  const simpleFilters = useMemo(() => buildSimpleFilters(searchQuery), [searchQuery]);
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...simpleFilters, ...appliedAdvancedFilters],
    [simpleFilters, appliedAdvancedFilters]
  );

  const { data: userDiscountLimitsData, isLoading } = useUserDiscountLimits({
    pageNumber,
    pageSize,
    filters: apiFilters,
  });

  const items = userDiscountLimitsData?.data || [];
  const totalCount = userDiscountLimitsData?.totalCount ?? 0;

  const createUserDiscountLimit = useCreateUserDiscountLimit();
  const updateUserDiscountLimit = useUpdateUserDiscountLimit();

  const columnsConfig = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => columnsConfig.map((c) => c.key as string), [columnsConfig]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof UserDiscountLimitDto>>(
    () => defaultColumnKeys as Array<keyof UserDiscountLimitDto>
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('user-discount-limit-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys as Array<keyof UserDiscountLimitDto>);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  useEffect(() => {
    setPageTitle(t('title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUserDiscountLimit(null);
    setFormOpen(true);
  };

  const handleEdit = (userDiscountLimit: UserDiscountLimitDto): void => {
    setEditingUserDiscountLimit(userDiscountLimit);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (editingUserDiscountLimit) {
      await updateUserDiscountLimit.mutateAsync({
        id: editingUserDiscountLimit.id,
        data: {
          erpProductGroupCode: data.erpProductGroupCode,
          salespersonId: data.salespersonId,
          maxDiscount1: data.maxDiscount1,
          maxDiscount2: data.maxDiscount2 || undefined,
          maxDiscount3: data.maxDiscount3 || undefined,
        },
      });
    } else {
      await createUserDiscountLimit.mutateAsync({
        erpProductGroupCode: data.erpProductGroupCode,
        salespersonId: data.salespersonId,
        maxDiscount1: data.maxDiscount1,
        maxDiscount2: data.maxDiscount2 || undefined,
        maxDiscount3: data.maxDiscount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingUserDiscountLimit(null);
  };

  useEffect(() => {
    setPageNumber(1);
  }, [searchQuery, appliedAdvancedFilters]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber, pageSize, filters: apiFilters }) });
  };

  const handleAdvancedSearch = (): void => {
    setAppliedAdvancedFilters(rowsToBackendFilters(draftFilterRows));
    setPageNumber(1);
    setShowFilters(false);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedAdvancedFilters([]);
    setPageNumber(1);
  };

  const hasFiltersActive = appliedAdvancedFilters.length > 0;

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return columnsConfig
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [columnsConfig, visibleColumns, columnOrder]);

  const exportToExcel = () => {
    const exportData = items.map((item) => {
      const row: Record<string, unknown> = {};
      displayedColumnsForExport.forEach((col) => {
        row[col.label] = item[col.key];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'UserDiscountLimits');
    XLSX.writeFile(wb, 'UserDiscountLimits.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    const tableColumn = displayedColumnsForExport.map((col) => col.label);
    const tableRows = items.map((item) =>
      displayedColumnsForExport.map((col) => {
        const val = item[col.key];
        return val === undefined || val === null ? '' : val;
      })
    );

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('UserDiscountLimits.pdf');
  };

  type PptxTableRow = Array<{ text: string }>;

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    // Add Title
    slide.addText("User Discount Limit Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = items.map((item) =>
      displayedColumnsForExport.map((col) => String(item[col.key] ?? ''))
    );

    const tableData: PptxTableRow[] = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "UserDiscountLimits.pptx" });
  };

  return (
    <div className="w-full space-y-6 relative animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description')}
          </p>
        </div>

        <Button 
              onClick={handleAddClick}
              className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
            >
          <Plus size={18} className="mr-2" />
          {t('create')}
        </Button>
      </div>

      {/* Filter & Actions Card */}
      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('common.search', { ns: 'common' })}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
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
                        {t('common.filters', { ns: 'common' })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters', { ns: 'common' })}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>

                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[420px]">
                          <UserDiscountLimitAdvancedFilter
                            draftRows={draftFilterRows}
                            onDraftRowsChange={setDraftFilterRows}
                            onSearch={handleAdvancedSearch}
                            onClear={handleAdvancedClear}
                            embedded
                          />
                        </div>
                    </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="user-discount-limit-management"
                userId={user?.id}
                columns={columnsConfig.map((c) => ({ key: c.key as string, label: c.label }))}
                visibleColumns={visibleColumns.map(String)}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next as Array<keyof UserDiscountLimitDto>);
                  saveColumnPreferences('user-discount-limit-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next.map(String),
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('user-discount-limit-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns.map(String),
                  });
                }}
              />
              <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 w-10 p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-white/10 hover:border-pink-500/30">
                            <Menu size={18} className="text-slate-500 dark:text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0">
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('common.export', { ns: 'common' })}
                            </div>
                        </div>
                        <div className="h-px bg-white/5 my-1"></div>
                        <div className="p-2">
                            <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-green-500/10 text-green-500">
                                    <FileSpreadsheet size={16} />
                                </div>
                                <span>{t('common.exportExcel', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-red-500/10 text-red-500">
                                    <FileText size={16} />
                                </div>
                                <span>{t('common.exportPDF', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPowerPoint} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                                    <Presentation size={16} />
                                </div>
                                <span>{t('common.exportPPT', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <UserDiscountLimitTable
          items={items}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          pageSize={pageSize}
          totalCount={totalCount}
          pageNumber={pageNumber}
          onPageChange={setPageNumber}
          columnOrder={columnOrder}
          onColumnOrderChange={(next) => {
            setColumnOrder(next);
            saveColumnPreferences('user-discount-limit-management', user?.id, {
              order: next,
              visibleKeys: visibleColumns.map(String),
            });
          }}
        />
      </div>

      <UserDiscountLimitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        userDiscountLimit={editingUserDiscountLimit}
        isLoading={createUserDiscountLimit.isPending || updateUserDiscountLimit.isPending}
      />
    </div>
  );
}
