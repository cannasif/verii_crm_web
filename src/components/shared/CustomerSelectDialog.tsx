import { type ReactElement, useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCustomerList } from '@/features/customer-management/hooks/useCustomerList';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import { cn } from '@/lib/utils';
import { Phone, Mail, ChevronRight, Search, Mic, Building2, User, X, Users, LayoutGrid, List } from 'lucide-react';

export interface CustomerSelectionResult {
  customerId?: number;
  erpCustomerCode?: string;
  customerName?: string;
}

interface CustomerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: CustomerSelectionResult) => void;
  className?: string;
}

interface CustomerCardProps {
  type: 'erp' | 'crm';
  name: string;
  customerCode?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  onClick: () => void;
  viewMode: 'list' | 'grid';
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-pink-500 dark:focus-visible:border-pink-500/70
  focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  
  focus:ring-2 focus:ring-pink-500/10 focus:ring-offset-0 focus:border-pink-500
  
  transition-all duration-200
`;

function CustomerCard({
  type,
  name,
  customerCode,
  phone,
  email,
  onClick,
  viewMode,
}: CustomerCardProps): ReactElement {
  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "group flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer h-full",
          "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-lg"
        )}
      >
        <div className="flex items-start justify-between w-full">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
            type === 'erp' 
              ? "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" 
              : "bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400"
          )}>
            {type === 'erp' ? <Building2 size={24} /> : <User size={24} />}
          </div>
          {customerCode && (
            <span className="text-[10px] font-mono font-medium px-2 py-1 rounded-md bg-slate-200/50 dark:bg-white/5 text-slate-600 dark:text-slate-400">
              {customerCode}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <span className="font-semibold text-base text-slate-900 dark:text-zinc-100 line-clamp-2 leading-tight min-h-[2.5rem]">{name}</span>
        </div>

        <div className="mt-auto pt-3 space-y-2 border-t border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Phone size={14} className="shrink-0 opacity-70" />
            <span className="truncate">{phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Mail size={14} className="shrink-0 opacity-70" />
            <span className="truncate">{email || '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
        "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-3 min-w-[30%] max-w-[40%]">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          type === 'erp' 
            ? "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" 
            : "bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400"
        )}>
          {type === 'erp' ? <Building2 size={18} /> : <User size={18} />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-sm text-slate-900 dark:text-zinc-200 truncate">{name}</span>
          {customerCode && (
            <span className="text-xs text-slate-500 dark:text-zinc-500 font-mono truncate">{customerCode}</span>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 min-w-0">
          <Phone size={14} className="shrink-0 opacity-50" />
          <span className="truncate">{phone || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 min-w-0">
          <Mail size={14} className="shrink-0 opacity-50" />
          <span className="truncate">{email || '-'}</span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
    </div>
  );
}

export function CustomerSelectDialog({
  open,
  onOpenChange,
  onSelect,
  className,
}: CustomerSelectDialogProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'erp' | 'potential' | 'all'>('erp');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        const langMap: Record<string, string> = {
          'tr': 'tr-TR',
          'en': 'en-US',
          'de': 'de-DE',
          'fr': 'fr-FR'
        };
        recognition.lang = langMap[i18n.language] || 'tr-TR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [i18n.language]);

  const handleVoiceSearch = (): void => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [open]);

  const { data: crmCustomersData, isLoading: crmLoading } = useCustomerList({
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'Id',
    sortDirection: 'asc',
  });

  const displayCustomers = useMemo(() => {
    const isErp = (c: CustomerDto): boolean =>
      c.isIntegrated === true ||
      (c.customerCode != null && String(c.customerCode).trim() !== '');
    const list = (crmCustomersData?.data ?? []).map((c) => ({
      ...c,
      type: (isErp(c) ? 'erp' : 'crm') as 'erp' | 'crm',
    }));
    if (!searchQuery.trim()) {
      return list.sort((a, b) => a.name.localeCompare(b.name, i18n.language));
    }
    const query = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          (c.customerCode != null && c.customerCode.toLowerCase().includes(query))
      )
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  }, [crmCustomersData?.data, searchQuery, i18n.language]);

  const erpCustomers = useMemo(
    () => displayCustomers.filter((c) => c.type === 'erp'),
    [displayCustomers]
  );
  const potentialCustomers = useMemo(
    () => displayCustomers.filter((c) => c.type === 'crm'),
    [displayCustomers]
  );

  const handleCustomerSelect = (customer: CustomerDto & { type: 'erp' | 'crm' }): void => {
    const code =
      customer.customerCode != null && String(customer.customerCode).trim() !== ''
        ? String(customer.customerCode).trim()
        : undefined;
    onSelect({
      customerId: customer.id,
      erpCustomerCode: code,
      customerName: customer.name,
    });
    onOpenChange(false);
  };

  const renderCustomerList = (
    list: Array<CustomerDto & { type: 'erp' | 'crm' }>,
    emptyKey: string
  ): ReactElement => {
    if (crmLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-500">
            {t('customerSelectDialog.loading', 'Yükleniyor...')}
          </div>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-500">
            {searchQuery.trim()
              ? t('customerSelectDialog.noResults', 'Arama sonucu bulunamadı')
              : t(emptyKey, { ns: 'customer-select-dialog', defaultValue: 'Müşteri bulunamadı' })}
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "grid gap-3",
        viewMode === 'list' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {list.map((customer) => (
          <CustomerCard
            key={`customer-${customer.id}`}
            type={customer.type}
            name={customer.name}
            customerCode={customer.customerCode ?? undefined}
            phone={customer.phone}
            email={customer.email}
            city={customer.cityName}
            district={customer.districtName}
            onClick={() => handleCustomerSelect(customer)}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[800px] shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]", className)}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'erp' | 'potential' | 'all')} className="flex flex-col h-full">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
                 <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                   <Users size={24} className="text-pink-600 dark:text-pink-500" />
                 </div>
               </div>
               <div className="space-y-1 text-left">
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('customerSelectDialog.title', 'Müşteri Seç')}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                    {t('customerSelectDialog.description', 'İşlem yapmak istediğiniz müşteriyi seçin')}
                  </DialogDescription>
               </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
              <X size={20} />
            </Button>
          </DialogHeader>

          <div className="p-6 pb-0 space-y-4 bg-white dark:bg-[#130822] shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-pink-500 transition-colors" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('customerSelectDialog.searchPlaceholder', 'İsim, kod veya telefon ile ara...')}
                  className={cn(INPUT_STYLE, "pl-9")}
                />
                {recognitionRef.current && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleVoiceSearch}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg",
                      isListening ? "text-pink-500" : "text-zinc-500"
                    )}
                  >
                    <Mic size={16} />
                  </Button>
                )}
              </div>
              
              <div className="flex bg-slate-100 dark:bg-[#1a1025] p-1 rounded-xl border border-slate-200 dark:border-white/5 shrink-0 h-12 items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    viewMode === 'list' 
                      ? "bg-white dark:bg-pink-500 text-slate-900 dark:text-white shadow-sm" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <List size={20} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    viewMode === 'grid' 
                      ? "bg-white dark:bg-pink-500 text-slate-900 dark:text-white shadow-sm" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <LayoutGrid size={20} />
                </Button>
              </div>
            </div>

            <TabsList className="bg-slate-100 dark:bg-[#1a1025] p-1 h-auto w-full grid grid-cols-3 rounded-xl border border-slate-200 dark:border-white/5">
              <TabsTrigger 
                value="erp" 
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-pink-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all py-2"
              >
                {t('customerSelectDialog.erpCustomers', 'ERP')}
              </TabsTrigger>
              <TabsTrigger 
                value="potential"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-pink-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all py-2"
              >
                {t('customerSelectDialog.potentialCustomers', 'Potansiyel')}
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-pink-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all py-2"
              >
                {t('customerSelectDialog.allCustomers', 'Tümü')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-6 pt-4 bg-white dark:bg-[#130822] custom-scrollbar">
            <TabsContent value="erp" className="mt-0 space-y-2 h-full">
              {renderCustomerList(erpCustomers, 'noErpCustomers')}
            </TabsContent>
            <TabsContent value="potential" className="mt-0 space-y-2 h-full">
              {renderCustomerList(potentialCustomers, 'noPotentialCustomers')}
            </TabsContent>
            <TabsContent value="all" className="mt-0 space-y-2 h-full">
              {renderCustomerList(displayCustomers, 'noCustomers')}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
