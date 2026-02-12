import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  RefreshCw,
  X,
  Filter,
  FileSpreadsheet,
  FileText,
  Presentation,
  Menu,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Trash2,
  Map,
  Hash,
  Building2,
  Activity
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DISTRICT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { DistrictStats } from './DistrictStats';
import { DistrictTable, getColumnsConfig } from './DistrictTable';
import { DistrictForm } from './DistrictForm';
import { useCreateDistrict } from '../hooks/useCreateDistrict';
import { useUpdateDistrict } from '../hooks/useUpdateDistrict';
import { useDistrictList } from '../hooks/useDistrictList';
import type { DistrictDto } from '../types/district-types';
import type { DistrictFormSchema } from '../types/district-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export function DistrictManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<DistrictDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Standard States matching CityManagement
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  
  const [activeFilters, setActiveFilters] = useState({
    name: '',
    code: '',
    city: '',
    status: 'all'
  });
  const [draftFilters, setDraftFilters] = useState(activeFilters);

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Initialize visible columns
  useEffect(() => {
    const cols = getColumnsConfig(t);
    setVisibleColumns(cols.map(c => c.key as string));
  }, [t]);

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

    // Advanced Filters
    if (activeFilters.name) {
      const lowerName = activeFilters.name.toLowerCase();
      result = result.filter(d => d.name?.toLowerCase().includes(lowerName));
    }
    if (activeFilters.code) {
      const lowerCode = activeFilters.code.toLowerCase();
      result = result.filter(d => d.erpCode?.toLowerCase().includes(lowerCode));
    }
    if (activeFilters.city) {
        const lowerCity = activeFilters.city.toLowerCase();
        result = result.filter(d => d.cityName?.toLowerCase().includes(lowerCity));
    }
    if (activeFilters.status !== 'all') {
      const isDeleted = activeFilters.status === 'inactive';
      result = result.filter(d => d.isDeleted === isDeleted);
    }

    return result;
  }, [allDistricts, searchTerm, activeFilters]);

  useEffect(() => {
    setPageTitle(t('districtManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  const handleApplyFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const reset = { name: '', code: '', city: '', status: 'all' };
    setDraftFilters(reset);
    setActiveFilters(reset);
  };
  
  const handleFilterChange = (key: keyof typeof draftFilters, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = (type: 'excel' | 'pdf' | 'ppt') => {
    toast.info(`${type.toUpperCase()} ${t('common.exportStarted')}`);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
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
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left Side: Search & Refresh */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-72 lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                    <Input
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all w-full"
                    />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={14} className="text-slate-400" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div 
                        className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group shrink-0"
                        onClick={handleRefresh}
                    >
                        <RefreshCw 
                            size={18} 
                            className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                    </div>
                </div>
            </div>

            {/* Right Side: Controls */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                {/* Page Size Dropdown */}
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

                {/* Filter Popover */}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                    <PopoverTrigger asChild>
                        <button 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showFilters ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Filter size={16} />
                            <span className="font-medium text-sm">{t('common.filters')}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters')}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                            <div className="grid grid-cols-2 gap-3">
                                
                                {/* Name - Col Span 2 */}
                                <div className="col-span-2">
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                            <Map size={14} />
                                        </div>
                                        <Input 
                                            placeholder={t('districtManagement.table.name')}
                                            value={draftFilters.name}
                                            onChange={(e) => handleFilterChange('name', e.target.value)}
                                            className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                        />
                                    </div>
                                </div>

                                {/* ERP Code */}
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Hash size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('districtManagement.table.erpCode')}
                                        value={draftFilters.code}
                                        onChange={(e) => handleFilterChange('code', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                {/* City Name */}
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Building2 size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('districtManagement.table.city')}
                                        value={draftFilters.city}
                                        onChange={(e) => handleFilterChange('city', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors z-10">
                                            <Activity size={14} />
                                        </div>
                                        <Select 
                                            value={draftFilters.status} 
                                            onValueChange={(val) => handleFilterChange('status', val)}
                                        >
                                            <SelectTrigger className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#151025] border-white/10 text-white">
                                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                                <SelectItem value="active">{t('status.active')}</SelectItem>
                                                <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                            <button 
                                onClick={handleClearFilters}
                                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors px-2 py-2"
                            >
                                <Trash2 size={14} />
                                <span>{t('common.clear')}</span>
                            </button>
                            
                            <button 
                                onClick={handleApplyFilters}
                                className="flex-1 bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                            >
                                {t('common.filter')}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Column Visibility Popover */}
                <Popover open={showColumns} onOpenChange={setShowColumns}>
                    <PopoverTrigger asChild>
                        <button 
                            onClick={() => setShowColumns(!showColumns)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showColumns ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <SlidersHorizontal size={16} />
                            <span className="font-medium text-sm">{t('common.columns')}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-80 p-0 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                            <h3 className="text-sm font-semibold text-gray-200">{t('common.visibleColumns')}</h3>
                            <button onClick={() => setShowColumns(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Checkbox List */}
                        <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#151025]">
                            <div className="grid grid-cols-2 gap-2">
                                {tableColumns.map((col) => (
                                    <label 
                                        key={col.key} 
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border border-transparent ${visibleColumns.includes(col.key as string) ? 'bg-pink-500/10 border-pink-500/20' : 'hover:bg-white/5'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleColumn(col.key as string); }}
                                    >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${visibleColumns.includes(col.key as string) ? 'bg-pink-500 border-pink-500' : 'bg-transparent border-gray-600'}`}>
                                            {visibleColumns.includes(col.key as string) && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-xs font-medium ${visibleColumns.includes(col.key as string) ? 'text-white' : 'text-gray-400'}`}>
                                            {col.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-end">
                            <button 
                                onClick={() => setShowColumns(false)}
                                className="bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold px-6 py-2 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                            >
                                {t('common.ok')}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                 {/* Export Menu */}
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
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <DistrictTable
          districts={filteredDistricts}
          isLoading={isLoading}
          onEdit={handleEdit}
          pageSize={pageSize}
          visibleColumns={visibleColumns as any}
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
