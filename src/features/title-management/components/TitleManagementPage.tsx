import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Activity, 
  Calendar, 
  Plus, 
  Search, 
  RefreshCw, 
  X,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Filter,
  Trash2,
  FileSpreadsheet,
  FileText,
  Presentation,
  Menu,
  Map,
  Code,
  CheckSquare
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { TitleTable, getColumnsConfig } from './TitleTable';
import { TitleForm } from './TitleForm';
import { useCreateTitle } from '../hooks/useCreateTitle';
import { useUpdateTitle } from '../hooks/useUpdateTitle';
import { useTitleStats } from '../hooks/useTitleStats';
import { useTitleList } from '../hooks/useTitleList';
import type { TitleDto } from '../types/title-types';
import type { TitleFormSchema } from '../types/title-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

const EMPTY_TITLES: TitleDto[] = [];

export function TitleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TitleDto | null>(null);
  
  // Client-side filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    titleName: '',
    code: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    titleName: '',
    code: ''
  });

  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();
  const { data: statsData } = useTitleStats();
  const queryClient = useQueryClient();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof TitleDto>>([]);

  useEffect(() => {
    setVisibleColumns(tableColumns.map(c => c.key));
  }, [tableColumns]);

  const toggleColumn = (key: keyof TitleDto) => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
  };

  // Fetch all titles for client-side filtering
  const { data: apiResponse, isLoading } = useTitleList({
    pageNumber: 1,
    pageSize: 10000
  });

  const titles = useMemo<TitleDto[]>(
    () => apiResponse?.data ?? EMPTY_TITLES,
    [apiResponse?.data]
  );

  const filteredTitles = useMemo(() => {
    if (!titles) return [];
    
    let result = [...titles];

    // Quick Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((title) => 
        (title.titleName && title.titleName.toLowerCase().includes(lowerSearch)) ||
        (title.code && title.code.toLowerCase().includes(lowerSearch))
      );
    }

    // Advanced Filters
    if (activeFilters.titleName) {
      const lower = activeFilters.titleName.toLowerCase();
      result = result.filter(c => c.titleName?.toLowerCase().includes(lower));
    }
    if (activeFilters.code) {
      const lower = activeFilters.code.toLowerCase();
      result = result.filter(c => c.code?.toLowerCase().includes(lower));
    }

    return result;
  }, [titles, searchTerm, activeFilters]);

  const handleFilterChange = (key: keyof typeof draftFilters, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };

  const clearAdvancedFilters = () => {
    const empty = { titleName: '', code: '' };
    setDraftFilters(empty);
    setActiveFilters(empty);
  };

  useEffect(() => {
    setPageTitle(t('titleManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingTitle(null);
    setFormOpen(true);
  };

  const handleEdit = (title: TitleDto): void => {
    setEditingTitle(title);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: TitleFormSchema): Promise<void> => {
    if (editingTitle) {
      await updateTitle.mutateAsync({
        id: editingTitle.id,
        data: { titleName: data.titleName, code: data.code || undefined },
      });
    } else {
      await createTitle.mutateAsync({ titleName: data.titleName, code: data.code || undefined });
    }
    setFormOpen(false);
    setEditingTitle(null);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportExcel = async () => {
    const dataToExport = filteredTitles.map(title => {
        const row: Record<string, string | number | boolean | null | undefined> = {};
        visibleColumns.forEach(key => {
            const col = tableColumns.find(c => c.key === key);
            if (col) {
                const value = title[key];
                row[col.label] = (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
                  ? value
                  : value ?? '';
            }
        });
        return row;
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Titles");
    XLSX.writeFile(wb, "titles.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumn = tableColumns
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const tableRows = filteredTitles.map(title => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => title[col.key] || '');
    });

    // @ts-ignore
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("titles.pdf");
  };

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    // Add Title
    slide.addText("Title Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    // Prepare Table Data
    const headers = tableColumns
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const rows = filteredTitles.map(title => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => String(title[col.key] || ''));
    });

    // @ts-ignore
    const tableData = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "titles.pptx" });
  };

  const cardStyle = `
    bg-white/60 dark:bg-[#1a1025]/40 
    hover:bg-white/90 dark:hover:bg-[#1a1025]/80
    border border-white/60 dark:border-white/5 
    shadow-sm hover:shadow-md 
    backdrop-blur-md 
    transition-all duration-300 
    hover:border-pink-500/30 
    group relative overflow-hidden
  `;
  
  const glowStyle = "absolute inset-0 bg-linear-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0 group-hover:from-pink-50/50 group-hover:to-orange-50/50 dark:group-hover:from-pink-500/5 dark:group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none";

  const stats = [
    {
      title: t('titleManagement.stats.totalTitles'),
      value: statsData?.totalTitles || 0,
      icon: Users,
      iconContainerClass: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border-pink-100 dark:border-pink-500/20',
    },
    {
      title: t('titleManagement.stats.activeTitles'),
      value: statsData?.activeTitles || 0,
      icon: Activity,
      iconContainerClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20',
    },
    {
      title: t('titleManagement.stats.newThisMonth'),
      value: statsData?.newThisMonth || 0,
      icon: Calendar,
      iconContainerClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    },
  ];

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('titleManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('titleManagement.description')}
          </p>
        </div>

        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('titleManagement.addButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={cardStyle}>
            <div className={glowStyle} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg shadow-sm border ${stat.iconContainerClass}`}>
                 <stat.icon size={18} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-72 lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                    <Input
                        placeholder={t('titleManagement.search')}
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
            
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
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
                            
                            {/* Title Name - Col Span 2 */}
                            <div className="col-span-2">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Map size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('titleManagement.form.titleNamePlaceholder', 'Ünvan adı ile ara...')}
                                        value={draftFilters.titleName}
                                        onChange={(e) => handleFilterChange('titleName', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>
                            </div>

                            {/* Code */}
                            <div className="col-span-2">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Code size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('titleManagement.form.codePlaceholder', 'Ünvan Kodu')}
                                        value={draftFilters.code}
                                        onChange={(e) => handleFilterChange('code', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                        <button 
                            onClick={clearAdvancedFilters}
                            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors px-2 py-2"
                        >
                            <Trash2 size={14} />
                            <span>{t('common.clear')}</span>
                        </button>
                        
                        <button 
                            onClick={applyAdvancedFilters}
                            className="flex-1 bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                        >
                            {t('common.filter')}
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

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

                    {/* Checkbox Listesi (Scrollable + Grid) */}
                    <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#151025]">
                        <div className="grid grid-cols-2 gap-2">
                            {tableColumns.map((col) => (
                                <label 
                                    key={col.key} 
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border border-transparent ${visibleColumns.includes(col.key) ? 'bg-pink-500/10 border-pink-500/20' : 'hover:bg-white/5'}`}
                                    onClick={(e) => { e.stopPropagation(); toggleColumn(col.key); }}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${visibleColumns.includes(col.key) ? 'bg-pink-500 border-pink-500' : 'bg-transparent border-gray-600'}`}>
                                        {visibleColumns.includes(col.key) && <Check size={10} className="text-white" />}
                                    </div>
                                    <span className={`text-xs font-medium ${visibleColumns.includes(col.key) ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                        <button 
                            onClick={() => setVisibleColumns(tableColumns.map(c => c.key))}
                            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-white transition-colors px-1"
                        >
                            <CheckSquare size={14} />
                            <span>{t('common.selectAll')}</span>
                        </button>
                        
                        <button 
                            onClick={() => setShowColumns(false)}
                            className="bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                        >
                            {t('common.ok')}
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white">
                    <Menu size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#151025] border border-white/10 shadow-2xl rounded-xl overflow-hidden p-0">
                  <div className="p-2 space-y-1">
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
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <TitleTable
          titles={filteredTitles}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          pageSize={pageSize}
        />
      </div>

      <TitleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        title={editingTitle}
        isLoading={createTitle.isPending || updateTitle.isPending}
      />
    </div>
  );
}