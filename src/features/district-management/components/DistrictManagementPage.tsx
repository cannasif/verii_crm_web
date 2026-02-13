import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Plus, X, Filter, FileSpreadsheet, FileText, Presentation, Menu, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { DISTRICT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { DistrictStats } from './DistrictStats';
import { DistrictTable, getColumnsConfig } from './DistrictTable';
import { DistrictForm } from './DistrictForm';
import { useCreateDistrict } from '../hooks/useCreateDistrict';
import { useUpdateDistrict } from '../hooks/useUpdateDistrict';
import { useDistrictList } from '../hooks/useDistrictList';
import type { DistrictDto } from '../types/district-types';
import type { DistrictFormSchema } from '../types/district-types';
import { applyDistrictFilters, DISTRICT_FILTER_COLUMNS } from '../types/district-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from 'sonner';

export function DistrictManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<DistrictDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createDistrict = useCreateDistrict();
  const updateDistrict = useUpdateDistrict();
  const queryClient = useQueryClient();

  const { data, isLoading } = useDistrictList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const allDistricts = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences('district-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const filteredDistricts = useMemo(() => {
    let result: DistrictDto[] = [...allDistricts];

    // Global Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(lowerTerm) ||
          d.erpCode?.toLowerCase().includes(lowerTerm) ||
          d.cityName?.toLowerCase().includes(lowerTerm)
      );
    }

    result = applyDistrictFilters(result, appliedFilterRows);
    return result;
  }, [allDistricts, searchTerm, appliedFilterRows]);

  useEffect(() => {
    setPageTitle(t('districtManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const handleAddClick = (): void => {
    setEditingDistrict(null);
    setFormOpen(true);
  };

  const handleEdit = (district: DistrictDto): void => {
    setEditingDistrict(district);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: DistrictFormSchema): Promise<void> => {
    if (editingDistrict) {
      await updateDistrict.mutateAsync({
        id: editingDistrict.id,
        data: {
          name: data.name,
          erpCode: data.erpCode || undefined,
          cityId: data.cityId,
        },
      });
    } else {
      await createDistrict.mutateAsync({
        name: data.name,
        erpCode: data.erpCode || undefined,
        cityId: data.cityId,
      });
    }
    setFormOpen(false);
    setEditingDistrict(null);
  };

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const handleExport = (type: 'excel' | 'pdf' | 'ppt') => {
    toast.info(`${type.toUpperCase()} ${t('common.exportStarted')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('districtManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('districtManagement.description')}
          </p>
        </div>
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('districtManagement.addButton')}
        </Button>
      </div>

      <DistrictStats />

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
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white">
                    <span className="font-medium text-sm">{pageSize}</span>
                    <ChevronDown size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-20 bg-[#151025] border border-white/10 shadow-2xl rounded-xl overflow-hidden p-1">
                  {[10, 20, 50, 100].map((size) => (
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
                    <PopoverContent side="bottom" align="end" className="w-[560px] max-w-[95vw] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters')}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[420px]">
                          <AdvancedFilter
                            columns={DISTRICT_FILTER_COLUMNS}
                            defaultColumn="name"
                            draftRows={draftFilterRows}
                            onDraftRowsChange={setDraftFilterRows}
                            onSearch={handleAdvancedSearch}
                            onClear={handleAdvancedClear}
                            translationNamespace="district-management"
                            embedded
                          />
                        </div>
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="district-management"
                userId={user?.id}
                columns={tableColumns.map((c) => ({ key: c.key as string, label: c.label }))}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('district-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('district-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns,
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
                                {t('common.actions')}
                            </div>
                        </div>
                        <div className="h-px bg-white/5 my-1"></div>
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('common.export')}
                            </div>
                            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                                <FileSpreadsheet size={16} className="text-emerald-500" />
                                <span>{t('common.exportExcel')}</span>
                            </button>
                            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                                <FileText size={16} className="text-red-400" />
                                <span>{t('common.exportPDF')}</span>
                            </button>
                            <button onClick={() => handleExport('ppt')} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
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
        <DistrictTable
          districts={filteredDistricts}
          isLoading={isLoading}
          onEdit={handleEdit}
          pageSize={pageSize}
          visibleColumns={visibleColumns as Array<keyof DistrictDto | 'status'>}
          columnOrder={columnOrder}
          onColumnOrderChange={(next) => {
            setColumnOrder(next);
            saveColumnPreferences('district-management', user?.id, {
              order: next,
              visibleKeys: visibleColumns,
            });
          }}
        />
      </div>

      <DistrictForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        district={editingDistrict}
        isLoading={createDistrict.isPending || updateDistrict.isPending}
      />
    </div>
  );
}
