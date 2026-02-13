import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  X,
  ChevronDown,
  Filter,
  Trash2,
  Menu,
  FileSpreadsheet,
  FileText,
  Presentation,
  User,
  MapPin,
  Phone
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
import { ShippingAddressForm } from './ShippingAddressForm';
import { ShippingAddressTable, getColumnsConfig } from './ShippingAddressTable';
import { useCreateShippingAddress } from '../hooks/useCreateShippingAddress';
import { useUpdateShippingAddress } from '../hooks/useUpdateShippingAddress';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import type { ShippingAddressDto, ShippingAddressFormSchema } from '../types/shipping-address-types';
import { useQueryClient } from '@tanstack/react-query';
import { SHIPPING_ADDRESS_QUERY_KEYS } from '../utils/query-keys';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { PageToolbar } from '@/components/shared';
import { ColumnPreferencesPopover } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';

export function ShippingAddressManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<ShippingAddressDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    customerName: '',
    name: '',
    postalCode: '',
    phone: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    customerName: '',
    name: '',
    postalCode: '',
    phone: ''
  });

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => tableColumns.filter((c) => c.visible).map((c) => c.key),
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences('shipping-address-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const createShippingAddress = useCreateShippingAddress();
  const updateShippingAddress = useUpdateShippingAddress();
  const queryClient = useQueryClient();

  const { data: apiResponse, isLoading } = useShippingAddresses({
    pageNumber: 1,
    pageSize: 10000,
  });

  const allShippingAddresses = useMemo(() => {
    return apiResponse?.data ?? [];
  }, [apiResponse]);

  const filteredShippingAddresses = useMemo(() => {
    let result: ShippingAddressDto[] = [...allShippingAddresses];

    // Quick Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(lowerTerm)) ||
          (d.address && d.address.toLowerCase().includes(lowerTerm)) ||
          (d.customerName && d.customerName.toLowerCase().includes(lowerTerm)) ||
          (d.contactPerson && d.contactPerson.toLowerCase().includes(lowerTerm)) ||
          (d.phone && d.phone.toLowerCase().includes(lowerTerm))
      );
    }

    // Advanced Filters
    if (activeFilters.customerName) {
      const lower = activeFilters.customerName.toLowerCase();
      result = result.filter(d => d.customerName?.toLowerCase().includes(lower));
    }
    if (activeFilters.name) {
      const lower = activeFilters.name.toLowerCase();
      result = result.filter(d => d.name?.toLowerCase().includes(lower));
    }
    if (activeFilters.postalCode) {
      const lower = activeFilters.postalCode.toLowerCase();
      result = result.filter(d => d.postalCode?.toLowerCase().includes(lower));
    }
    if (activeFilters.phone) {
      const lower = activeFilters.phone.toLowerCase();
      result = result.filter(d => d.phone?.toLowerCase().includes(lower));
    }

    return result;
  }, [allShippingAddresses, searchTerm, activeFilters]);

  useEffect(() => {
    setPageTitle(t('shippingAddressManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleCreateClick = (): void => {
    setSelectedShippingAddress(null);
    setFormOpen(true);
  };

  const handleEditClick = (shippingAddress: ShippingAddressDto): void => {
    setSelectedShippingAddress(shippingAddress);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ShippingAddressFormSchema): Promise<void> => {
    const processedData = {
      ...data,
      name: data.name ?? undefined,
      postalCode: data.postalCode ?? undefined,
      contactPerson: data.contactPerson ?? undefined,
      phone: data.phone ?? undefined,
      notes: data.notes ?? undefined,
      countryId: data.countryId ?? undefined,
      cityId: data.cityId ?? undefined,
      districtId: data.districtId ?? undefined,
      isDefault: data.isDefault,
      isActive: data.isActive,
    };
    if (selectedShippingAddress) {
      await updateShippingAddress.mutateAsync({
        id: selectedShippingAddress.id,
        data: processedData,
      });
    } else {
      await createShippingAddress.mutateAsync(processedData);
    }
    setFormOpen(false);
    setSelectedShippingAddress(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.LIST] });
  };

  const hasFiltersActive =
    activeFilters.customerName !== '' ||
    activeFilters.name !== '' ||
    activeFilters.postalCode !== '' ||
    activeFilters.phone !== '';

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return tableColumns
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

  const handleFilterChange = (key: keyof typeof draftFilters, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };

  const clearAdvancedFilters = () => {
    const empty = { customerName: '', name: '', postalCode: '', phone: '' };
    setDraftFilters(empty);
    setActiveFilters(empty);
  };

  const handleExportExcel = async () => {
    const dataToExport = filteredShippingAddresses.map((item) => {
      const row: Record<string, string | number | boolean | null | undefined> = {};
      displayedColumnsForExport.forEach((col) => {
        const value = item[col.key as keyof ShippingAddressDto];
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
    XLSX.utils.book_append_sheet(wb, ws, "Shipping Addresses");
    XLSX.writeFile(wb, "shipping_addresses.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumnLabels = displayedColumnsForExport.map((col) => col.label);
    const tableRows = filteredShippingAddresses.map((item) =>
      displayedColumnsForExport.map((col) => item[col.key as keyof ShippingAddressDto] ?? '')
    );

    autoTable(doc, {
        head: [tableColumnLabels],
        body: tableRows,
    });

    doc.save("shipping_addresses.pdf");
  };

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    slide.addText("Shipping Address Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = filteredShippingAddresses.map((item) =>
      displayedColumnsForExport.map((col) =>
        String(item[col.key as keyof ShippingAddressDto] ?? '')
      )
    );

    const tableData = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "shipping_addresses.pptx" });
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('shippingAddressManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('shippingAddressManagement.description')}
          </p>
        </div>

        <Button 
          onClick={handleCreateClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('shippingAddressManagement.create')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('shippingAddressManagement.search')}
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
                            
                            {/* Customer Name - Col Span 2 */}
                            <div className="col-span-2">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <User size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('shippingAddressManagement.customerName')}
                                        value={draftFilters.customerName}
                                        onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <MapPin size={14} />
                                </div>
                                <Input 
                                    placeholder={t('shippingAddressManagement.name')}
                                    value={draftFilters.name}
                                    onChange={(e) => handleFilterChange('name', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                            {/* Postal Code */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <MapPin size={14} />
                                </div>
                                <Input 
                                    placeholder={t('shippingAddressManagement.postalCode')}
                                    value={draftFilters.postalCode}
                                    onChange={(e) => handleFilterChange('postalCode', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                             {/* Phone */}
                             <div className="relative group col-span-2">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <Phone size={14} />
                                </div>
                                <Input 
                                    placeholder={t('shippingAddressManagement.phone')}
                                    value={draftFilters.phone}
                                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
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
              <ColumnPreferencesPopover
                pageKey="shipping-address-management"
                userId={user?.id}
                columns={tableColumns.map((c) => ({ key: c.key, label: c.label }))}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('shipping-address-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('shipping-address-management', user?.id, {
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
        <ShippingAddressTable
          data={filteredShippingAddresses}
          isLoading={isLoading}
          onEdit={handleEditClick}
          pageSize={pageSize}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onColumnOrderChange={(next) => {
            setColumnOrder(next);
            saveColumnPreferences('shipping-address-management', user?.id, {
              order: next,
              visibleKeys: visibleColumns,
            });
          }}
        />
      </div>

      <ShippingAddressForm
        open={formOpen}
        onOpenChange={setFormOpen}
        shippingAddress={selectedShippingAddress}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
