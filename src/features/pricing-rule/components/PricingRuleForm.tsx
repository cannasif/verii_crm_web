import { type ReactElement, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePricingRuleHeader } from '../hooks/usePricingRuleHeader';
import { useCreatePricingRuleHeader } from '../hooks/useCreatePricingRuleHeader';
import { useUpdatePricingRuleHeader } from '../hooks/useUpdatePricingRuleHeader';
import { PricingRuleHeaderForm } from './PricingRuleHeaderForm';
import { PricingRuleLineTable } from './PricingRuleLineTable';
import { PricingRuleSalesmanTable } from './PricingRuleSalesmanTable';
import { 
  PricingRuleType, 
  type PricingRuleHeaderCreateDto, 
  type PricingRuleLineFormState, 
  type PricingRuleSalesmanFormState,
  pricingRuleHeaderSchema,
  type PricingRuleFormSchema
} from '../types/pricing-rule-types';
import type { PricingRuleHeaderGetDto } from '../types/pricing-rule-types';
import { 
  FileText, 
  List, 
  Users, 
  Loader2,
  Tag,
} from 'lucide-react';
import { Cancel01Icon } from 'hugeicons-react';

interface PricingRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header?: PricingRuleHeaderGetDto | null;
}

export function PricingRuleForm({ open, onOpenChange, header }: PricingRuleFormProps): ReactElement {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'header' | 'lines' | 'salesmen'>('header');
  
  const { data: existingHeader, isLoading } = usePricingRuleHeader(header?.id || 0);
  const createMutation = useCreatePricingRuleHeader();
  const updateMutation = useUpdatePricingRuleHeader();

  const form = useForm<PricingRuleFormSchema>({
    resolver: zodResolver(pricingRuleHeaderSchema),
    defaultValues: {
      ruleType: PricingRuleType.Quotation,
      ruleCode: '',
      ruleName: '',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: null,
      erpCustomerCode: null,
      branchCode: null,
      priceIncludesVat: false,
      isActive: true,
      lines: [],
      salesmen: [],
    },
  });

  const watchedLines = form.watch('lines');
  const watchedSalesmen = form.watch('salesmen');

  useEffect(() => {
    if (existingHeader) {
      const mappedLines = existingHeader.lines?.map((line) => ({
        id: `existing-${line.id}`,
        stokCode: line.stokCode,
        minQuantity: line.minQuantity,
        maxQuantity: line.maxQuantity,
        fixedUnitPrice: line.fixedUnitPrice,
        currencyCode: line.currencyCode ? (typeof line.currencyCode === 'string' ? Number(line.currencyCode) || 1 : line.currencyCode) : 1,
        discountRate1: line.discountRate1,
        discountAmount1: line.discountAmount1,
        discountRate2: line.discountRate2,
        discountAmount2: line.discountAmount2,
        discountRate3: line.discountRate3,
        discountAmount3: line.discountAmount3,
        isEditing: false,
      })) as PricingRuleLineFormState[];

      const mappedSalesmen = existingHeader.salesmen?.map((salesman) => ({
        id: `existing-${salesman.id}`,
        salesmanId: salesman.salesmanId,
      })) as PricingRuleSalesmanFormState[];

      form.reset({
        ruleType: existingHeader.ruleType,
        ruleCode: existingHeader.ruleCode,
        ruleName: existingHeader.ruleName,
        validFrom: existingHeader.validFrom.split('T')[0],
        validTo: existingHeader.validTo.split('T')[0],
        customerId: existingHeader.customerId,
        erpCustomerCode: existingHeader.erpCustomerCode,
        branchCode: existingHeader.branchCode,
        priceIncludesVat: existingHeader.priceIncludesVat,
        isActive: existingHeader.isActive,
        lines: mappedLines,
        salesmen: mappedSalesmen,
      });
    } else {
      form.reset({
        ruleType: PricingRuleType.Quotation,
        ruleCode: '',
        ruleName: '',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerId: null,
        erpCustomerCode: null,
        branchCode: null,
        priceIncludesVat: false,
        isActive: true,
        lines: [],
        salesmen: [],
      });
    }
  }, [existingHeader, form, open]);

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab('header');
    }
  }, [open]);

  const onSubmit = async (data: PricingRuleFormSchema): Promise<void> => {
    const validLines = data.lines?.filter((line) => line.stokCode && line.stokCode.trim() !== '') || [];

    if (validLines.length === 0) {
      toast.error(
        t('pricingRule.form.lines.required'),
        {
          description: t('pricingRule.form.lines.requiredMessage'),
        }
      );
      setActiveTab('lines');
      return;
    }

    const linesWithInvalidMinQuantity = validLines.filter((line) => 
      line.minQuantity < 0 || 
      isNaN(line.minQuantity) || 
      line.minQuantity === null || 
      line.minQuantity === undefined
    );
    
    if (linesWithInvalidMinQuantity.length > 0) {
      toast.error(
        t('pricingRule.form.lines.minQuantityInvalid'),
        {
          description: t('pricingRule.form.lines.minQuantityInvalidMessage'),
        }
      );
      setActiveTab('lines');
      return;
    }

    const linesWithInvalidCurrency = validLines.filter((line) => 
      !line.currencyCode || 
      line.currencyCode === undefined || 
      line.currencyCode === null
    );
    
    if (linesWithInvalidCurrency.length > 0) {
      toast.error(
        t('pricingRule.form.lines.currencyCodeRequired'),
        {
          description: t('pricingRule.form.lines.currencyCodeRequiredMessage'),
        }
      );
      setActiveTab('lines');
      return;
    }

    try {
      const payload: PricingRuleHeaderCreateDto = {
        ...data,
        lines: validLines.map(({ id, isEditing, ...line }) => ({
          ...line,
          pricingRuleHeaderId: 0,
          minQuantity: line.minQuantity ?? 0,
          currencyCode: typeof line.currencyCode === 'number' ? String(line.currencyCode) : (line.currencyCode ? String(line.currencyCode) : ''),
          discountRate1: line.discountRate1 ?? 0,
          discountAmount1: line.discountAmount1 ?? 0,
          discountRate2: line.discountRate2 ?? 0,
          discountAmount2: line.discountAmount2 ?? 0,
          discountRate3: line.discountRate3 ?? 0,
          discountAmount3: line.discountAmount3 ?? 0,
        })),
        salesmen: data.salesmen?.map(({ id, ...salesman }) => ({
          ...salesman,
          pricingRuleHeaderId: 0,
        })) || [],
      };

      if (header?.id) {
        const result = await updateMutation.mutateAsync({ id: header.id, data: payload });
        if (result) {
          toast.success(
            t('pricingRule.form.updateSuccess'),
            {
              description: t('pricingRule.form.updateSuccessMessage'),
            }
          );
          onOpenChange(false);
        }
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (result) {
          toast.success(
            t('pricingRule.form.createSuccess'),
            {
              description: t('pricingRule.form.createSuccessMessage'),
            }
          );
          onOpenChange(false);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('pricingRule.form.error');
      toast.error(
        t('pricingRule.form.error'),
        {
          description: errorMessage,
        }
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading && header?.id) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex items-center justify-center bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10">
           <div className="flex flex-col items-center gap-4">
             <div className="relative">
               <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-pink-500" />
               <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-pink-500 opacity-20" />
             </div>
             <div className="text-sm font-medium text-slate-500 animate-pulse">
               {t('pricingRule.loadingDescription')}
             </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl overflow-hidden transition-colors duration-300">
        
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <Tag size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {header?.id
                    ? t('pricingRule.form.edit')
                    : t('pricingRule.form.create')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {header?.id
                    ? t('pricingRule.form.editDescription')
                    : t('pricingRule.form.createDescription')}
                </DialogDescription>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'header' | 'lines' | 'salesmen')} className="w-full flex-1 flex flex-col min-h-0">
                
                <div className="px-6 pt-4 pb-2 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <TabsList className="bg-slate-200/50 dark:bg-white/10 p-1 rounded-lg h-auto grid grid-cols-3 w-full max-w-md">
                      <TabsTrigger value="header" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1025] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-sm py-2 text-xs font-medium transition-all">
                        <FileText size={14} className="mr-2" />
                        {t('pricingRule.form.tabs.header')}
                      </TabsTrigger>
                      <TabsTrigger value="lines" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1025] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-sm py-2 text-xs font-medium transition-all">
                        <List size={14} className="mr-2" />
                        {t('pricingRule.form.tabs.lines')} 
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[10px]">{watchedLines?.length || 0}</span>
                      </TabsTrigger>
                      <TabsTrigger value="salesmen" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1025] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-sm py-2 text-xs font-medium transition-all">
                        <Users size={14} className="mr-2" />
                        {t('pricingRule.form.tabs.salesmen')}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[10px]">{watchedSalesmen?.length || 0}</span>
                      </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <TabsContent value="header" className="mt-0 h-full focus-visible:outline-none focus-visible:ring-0">
                    <PricingRuleHeaderForm />
                  </TabsContent>
                  
                  <TabsContent value="lines" className="mt-0 h-full focus-visible:outline-none focus-visible:ring-0">
                    <PricingRuleLineTable header={header} />
                  </TabsContent>
                  
                  <TabsContent value="salesmen" className="mt-0 h-full focus-visible:outline-none focus-visible:ring-0">
                    <PricingRuleSalesmanTable header={header} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 shrink-0 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {t('pricingRule.form.cancel')}
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white shadow-lg shadow-pink-500/20 border-0"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('pricingRule.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
