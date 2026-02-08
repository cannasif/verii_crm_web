import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ErpCustomer } from '../types/erp-customer-types';
import { 
  UserCircleIcon,
  Building03Icon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Invoice01Icon,
  Globe02Icon,
  Cancel01Icon,
  MapsLocation01Icon,
  City01Icon
} from 'hugeicons-react';

interface ErpCustomerDetailModalProps {
  customer: ErpCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  read-only:opacity-100 read-only:cursor-default
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

export function ErpCustomerDetailModal({
  customer,
  open,
  onOpenChange,
}: ErpCustomerDetailModalProps): ReactElement {
  const { t } = useTranslation('erp-customer-management');

  if (!customer) return <></>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-3xl w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <Building03Icon size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('details.title', 'Müşteri Detayları')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                  {customer.customerName}
                </DialogDescription>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="space-y-6">
            
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                
                <div className="col-span-1 md:col-span-2">
                    <div className="space-y-2">
                        <label className={LABEL_STYLE}>
                            <UserCircleIcon size={16} className="text-pink-500" />
                            {t('table.customerName', 'Müşteri Adı')}
                        </label>
                        <Input readOnly value={customer.customerName || '-'} className={INPUT_STYLE} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Building03Icon size={16} className="text-pink-500" />
                        {t('table.customerCode', 'Müşteri Kodu')}
                    </label>
                    <Input readOnly value={customer.customerCode || '-'} className={INPUT_STYLE} />
                </div>

                <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Building03Icon size={16} className="text-pink-500" />
                        {t('table.branchCode', 'Şube Kodu')} / {t('table.businessUnitCode', 'İş Birimi')}
                    </label>
                    <Input readOnly value={`${customer.branchCode || '-'} / ${customer.businessUnit || '-'}`} className={INPUT_STYLE} />
                </div>

                <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Call02Icon size={16} className="text-pink-500" />
                        {t('table.phone', 'Telefon')}
                    </label>
                    <Input readOnly value={customer.phone || '-'} className={INPUT_STYLE} />
                </div>

                <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Mail01Icon size={16} className="text-pink-500" />
                        {t('table.email', 'E-posta')}
                    </label>
                    <Input readOnly value={customer.email || '-'} className={INPUT_STYLE} />
                </div>

                 <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Globe02Icon size={16} className="text-pink-500" />
                        {t('table.website', 'Web Sitesi')}
                    </label>
                    <Input readOnly value={customer.website || '-'} className={INPUT_STYLE} />
                </div>
                
                 <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Invoice01Icon size={16} className="text-pink-500" />
                        {t('table.taxNumber', 'Vergi No')} / {t('table.tcknNumber', 'TCKN')}
                    </label>
                    <Input readOnly value={`${customer.taxNumber || '-'} / ${customer.tckn || '-'}`} className={INPUT_STYLE} />
                </div>

                 <div className="space-y-2">
                    <label className={LABEL_STYLE}>
                        <Invoice01Icon size={16} className="text-pink-500" />
                        {t('table.taxOffice', 'Vergi Dairesi')}
                    </label>
                    <Input readOnly value={customer.taxOffice || '-'} className={INPUT_STYLE} />
                </div>
            </div>

            {/* Adres Bilgileri */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Location01Icon size={18} className="text-orange-500" />
                    {t('details.addressInfo', 'Adres Bilgileri')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div className="space-y-2">
                        <label className={LABEL_STYLE}>
                            <City01Icon size={16} className="text-pink-500" />
                            {t('table.city', 'Şehir')} / {t('table.district', 'İlçe')}
                        </label>
                        <Input readOnly value={`${customer.city || '-'} / ${customer.district || '-'}`} className={INPUT_STYLE} />
                    </div>
                     <div className="space-y-2">
                        <label className={LABEL_STYLE}>
                            <MapsLocation01Icon size={16} className="text-pink-500" />
                            {t('table.countryCode', 'Ülke Kodu')}
                        </label>
                        <Input readOnly value={customer.countryCode || '-'} className={INPUT_STYLE} />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className={LABEL_STYLE}>
                            <Location01Icon size={16} className="text-pink-500" />
                            {t('table.address', 'Adres')}
                        </label>
                        <Textarea 
                            readOnly 
                            value={customer.address || '-'} 
                            className={`${INPUT_STYLE} min-h-[80px] h-auto py-3 resize-none`} 
                        />
                    </div>
                </div>
            </div>

          </div>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-11 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {t('common.close', 'Kapat')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
