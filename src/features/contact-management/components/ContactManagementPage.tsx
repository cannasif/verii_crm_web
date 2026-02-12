import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Search, RefreshCw, X, Filter, Trash2, Menu, FileSpreadsheet, FileText, Presentation, Check, SlidersHorizontal, CheckSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { ContactStats } from './ContactStats';
import { ContactTable, getColumnsConfig } from './ContactTable';
import { ContactForm } from './ContactForm';
import { useCreateContact } from '../hooks/useCreateContact';
import { useUpdateContact } from '../hooks/useUpdateContact';
import { useContactList } from '../hooks/useContactList';
import type { ContactDto } from '../types/contact-types';
import type { ContactFormSchema } from '../types/contact-types';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Mail01Icon, 
  Call02Icon, 
  SmartPhone01Icon, 
  Building03Icon, 
  Briefcase01Icon,
  UserCircleIcon, 
} from 'hugeicons-react';

const EMPTY_CONTACTS: ContactDto[] = [];

interface ContactFilterState {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  customerName: string;
  titleName: string;
}

export function ContactManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialFilters: ContactFilterState = {
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    customerName: '',
    titleName: ''
  };

  const [draftFilters, setDraftFilters] = useState<ContactFilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ContactFilterState>(initialFilters);

  const queryClient = useQueryClient();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof ContactDto>>(
    tableColumns.map(col => col.key)
  );

  const { data: apiResponse, isLoading } = useContactList({ 
    pageNumber: 1, 
    pageSize: 10000 
  });

  const contacts = useMemo<ContactDto[]>(
    () => apiResponse?.data ?? EMPTY_CONTACTS,
    [apiResponse?.data]
  );

  useEffect(() => {
    setPageTitle(t('contactManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const filteredContacts = useMemo<ContactDto[]>(() => {
    if (!contacts) return [];

    let result: ContactDto[] = [...contacts];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((c) => 
        (c.fullName && c.fullName.toLowerCase().includes(lowerSearch)) ||
        (c.firstName && c.firstName.toLowerCase().includes(lowerSearch)) ||
        (c.lastName && c.lastName.toLowerCase().includes(lowerSearch)) ||
        (c.email && c.email.toLowerCase().includes(lowerSearch)) ||
        (c.phone && c.phone.includes(lowerSearch)) ||
        (c.customerName && c.customerName.toLowerCase().includes(lowerSearch))
      );
    }

    if (appliedFilters.fullName) {
      result = result.filter(c => c.fullName?.toLowerCase().includes(appliedFilters.fullName.toLowerCase()));
    }
    if (appliedFilters.firstName) {
      result = result.filter(c => c.firstName?.toLowerCase().includes(appliedFilters.firstName.toLowerCase()));
    }
    if (appliedFilters.lastName) {
      result = result.filter(c => c.lastName?.toLowerCase().includes(appliedFilters.lastName.toLowerCase()));
    }
    if (appliedFilters.email) {
      result = result.filter(c => c.email?.toLowerCase().includes(appliedFilters.email.toLowerCase()));
    }
    if (appliedFilters.phone) {
      result = result.filter(c => c.phone?.includes(appliedFilters.phone));
    }
    if (appliedFilters.mobile) {
      result = result.filter(c => c.mobile?.includes(appliedFilters.mobile));
    }
    if (appliedFilters.customerName) {
      result = result.filter(c => c.customerName?.toLowerCase().includes(appliedFilters.customerName.toLowerCase()));
    }
    if (appliedFilters.titleName) {
      result = result.filter(c => c.titleName?.toLowerCase().includes(appliedFilters.titleName.toLowerCase()));
    }

    return result;
  }, [contacts, searchTerm, appliedFilters]);

  const handleFilterChange = (key: keyof ContactFilterState, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => {
    setAppliedFilters(draftFilters);
    setSearchTerm(''); 
  };

  const clearAdvancedFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleAddClick = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const clearSearch = () => setSearchTerm('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleEdit = (contact: ContactDto) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ContactFormSchema) => {
    const fullName = [data.firstName, data.middleName, data.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');

    const cleanData = {
      salutation: data.salutation,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || undefined,
      lastName: data.lastName.trim(),
      fullName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      notes: data.notes || undefined,
      customerId: data.customerId,
      titleId: data.titleId || null,
    };

    if (editingContact) {
      await updateContact.mutateAsync({
        id: editingContact.id,
        data: cleanData,
      });
    } else {
      await createContact.mutateAsync(cleanData);
    }
    setFormOpen(false);
    setEditingContact(null);
  };

  const toggleColumn = (key: keyof ContactDto) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handleExportExcel = async () => {
    const dataToExport = filteredContacts.map(contact => {
        const row: Record<string, string | number | boolean | null | undefined> = {};
        visibleColumns.forEach(key => {
            const col = tableColumns.find(c => c.key === key);
            if (col) {
                const value = contact[key];
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
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "contacts.xlsx");
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

    const tableRows = filteredContacts.map(contact => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => contact[col.key] || '');
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("contacts.pdf");
  };

  type PptxTableRow = Array<{ text: string }>;

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    // Add Title
    slide.addText("Contact Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    // Prepare Table Data
    const headers = tableColumns
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const rows = filteredContacts.map(contact => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => String(contact[col.key] || ''));
    });

    const tableData: PptxTableRow[] = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "contacts.pptx" });
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('contactManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('contactManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('contactManagement.addButton')}
        </Button>
      </div>

      <div className="flex-none">
        <ContactStats />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 overflow-hidden transition-all duration-300">
          
          <div className="flex-none p-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
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
                            
                            {/* Full Name - Col Span 2 */}
                            <div className="col-span-2">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <UserCircleIcon size={14} />
                                    </div>
                                    <Input 
                                        placeholder="Ad Soyad ile ara..." 
                                        value={draftFilters.fullName}
                                        onChange={(e) => handleFilterChange('fullName', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <Mail01Icon size={14} />
                                </div>
                                <Input 
                                    placeholder="E-posta" 
                                    value={draftFilters.email}
                                    onChange={(e) => handleFilterChange('email', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                            {/* Phone */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <Call02Icon size={14} />
                                </div>
                                <Input 
                                    placeholder="Telefon" 
                                    value={draftFilters.phone}
                                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                            {/* Mobile */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <SmartPhone01Icon size={14} />
                                </div>
                                <Input 
                                    placeholder="Cep" 
                                    value={draftFilters.mobile}
                                    onChange={(e) => handleFilterChange('mobile', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                            {/* Customer */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                    <Building03Icon size={14} />
                                </div>
                                <Input 
                                    placeholder="Müşteri" 
                                    value={draftFilters.customerName}
                                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                    className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                />
                            </div>

                            {/* Title - Col Span 2 */}
                            <div className="col-span-2">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Briefcase01Icon size={14} />
                                    </div>
                                    <Input 
                                        placeholder="Ünvan / Departman" 
                                        value={draftFilters.titleName}
                                        onChange={(e) => handleFilterChange('titleName', e.target.value)}
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
                            <span>Temizle</span>
                        </button>
                        
                        <button 
                            onClick={() => {
                                applyAdvancedFilters();
                                setShowFilters(false);
                            }}
                            className="flex-1 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                        >
                            SONUÇLARI LİSTELE
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
                        <span className="font-medium text-sm">{t('contactManagement.columns')}</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-80 p-0 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                        <h3 className="text-sm font-semibold text-gray-200">{t('contactManagement.visibleColumns')}</h3>
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
                                    <span className={`text-xs font-medium ${visibleColumns.includes(col.key) ? 'text-white' : 'text-gray-400'} truncate`}>
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
                            className="bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                        >
                            TAMAM
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
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
          </div>

{/* Old filters removed */}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

        <ContactTable
            contacts={filteredContacts}
            isLoading={isLoading}
            onEdit={handleEdit}
            visibleColumns={visibleColumns}
            pageSize={pageSize}
          />
      </div>

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        contact={editingContact}
        isLoading={createContact.isPending || updateContact.isPending}
      />
    </div>
    </div>
  );
}
