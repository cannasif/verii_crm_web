import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Package, ChevronDown, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { productPricingGroupByFormSchema, type ProductPricingGroupByFormSchema, calculateFinalPrice, formatPrice } from '../types/product-pricing-group-by-types';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useStokGroup } from '@/services/hooks/useStokGroup';
import type { ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';
import { StockGroupSelectDialog } from '@/components/shared/StockGroupSelectDialog';
import { CurrencySelectDialog } from '@/components/shared/CurrencySelectDialog';
import { Cancel01Icon } from 'hugeicons-react';

interface ProductPricingGroupByFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductPricingGroupByFormSchema) => void | Promise<void>;
  productPricingGroupBy?: ProductPricingGroupByDto | null;
  isLoading?: boolean;
  excludeGroupCodes?: string[];
}

const INPUT_STYLE = "h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 text-sm";
const LABEL_STYLE = "text-zinc-700 dark:text-zinc-300 font-medium text-xs mb-1.5 block";

export function ProductPricingGroupByForm({
  open,
  onOpenChange,
  onSubmit,
  productPricingGroupBy,
  isLoading = false,
  excludeGroupCodes,
}: ProductPricingGroupByFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: exchangeRates = [] } = useExchangeRate();
  const { data: stokGroups = [] } = useStokGroup();
  
  const [groupSelectDialogOpen, setGroupSelectDialogOpen] = useState(false);
  const [currencySelectDialogOpen, setCurrencySelectDialogOpen] = useState(false);

  const form = useForm<ProductPricingGroupByFormSchema>({
    resolver: zodResolver(productPricingGroupByFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      erpGroupCode: '',
      currency: '1',
      listPrice: 0,
      costPrice: 0,
      discount1: undefined,
      discount2: undefined,
      discount3: undefined,
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedValues = form.watch(['listPrice', 'discount1', 'discount2', 'discount3', 'currency']);

  const finalPrice = useMemo(() => {
    return calculateFinalPrice(
      watchedValues[0] || 0,
      watchedValues[1],
      watchedValues[2],
      watchedValues[3]
    );
  }, [watchedValues]);

  useEffect(() => {
    if (productPricingGroupBy) {
      form.reset({
        erpGroupCode: productPricingGroupBy.erpGroupCode,
        currency: productPricingGroupBy.currency,
        listPrice: productPricingGroupBy.listPrice,
        costPrice: productPricingGroupBy.costPrice,
        discount1: productPricingGroupBy.discount1 || undefined,
        discount2: productPricingGroupBy.discount2 || undefined,
        discount3: productPricingGroupBy.discount3 || undefined,
      });
    } else {
      form.reset({
        erpGroupCode: '',
        currency: '1',
        listPrice: 0,
        costPrice: 0,
        discount1: undefined,
        discount2: undefined,
        discount3: undefined,
      });
    }
  }, [productPricingGroupBy, form]);

  const handleSubmit = async (data: ProductPricingGroupByFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[700px] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl max-h-[90vh] h-auto overflow-hidden transition-colors duration-300">
        
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 flex-shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <Package size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {productPricingGroupBy
                  ? t('productPricingGroupByManagement.edit')
                  : t('productPricingGroupByManagement.create')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {productPricingGroupBy
                  ? t('productPricingGroupByManagement.editDescription')
                  : t('productPricingGroupByManagement.createDescription')}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Form {...form}>
            <form id="product-pricing-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col min-h-0">
              <div className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="erpGroupCode"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('productPricingGroupByManagement.erpGroupCode')} *
                      </FormLabel>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            INPUT_STYLE,
                            "w-full justify-between px-3 font-normal",
                            !field.value && "text-slate-400 dark:text-slate-600"
                          )}
                          onClick={() => setGroupSelectDialogOpen(true)}
                        >
                          {field.value ? (
                            <span className="truncate">
                              {(() => {
                                const group = stokGroups.find(
                                  (g) => (g.grupKodu || `__group_${g.isletmeKodu}_${g.subeKodu}`) === field.value
                                );
                                if (!group) return field.value;
                                return group.grupKodu && group.grupAdi 
                                  ? `${group.grupKodu} - ${group.grupAdi}`
                                  : group.grupAdi || group.grupKodu || field.value;
                              })()}
                            </span>
                          ) : (
                            t('productPricingGroupByManagement.selectErpGroupCode')
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                      <StockGroupSelectDialog
                        open={groupSelectDialogOpen}
                        onOpenChange={setGroupSelectDialogOpen}
                        selectedGroupCode={field.value}
                        onSelect={(group) => {
                          const code = group.grupKodu || `__group_${group.isletmeKodu}_${group.subeKodu}`;
                          field.onChange(code);
                        }}
                        excludeGroupCodes={excludeGroupCodes}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('productPricingGroupByManagement.currency')} *
                      </FormLabel>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            INPUT_STYLE,
                            "w-full justify-between px-3 font-normal",
                            !field.value && "text-slate-400 dark:text-slate-600"
                          )}
                          onClick={() => setCurrencySelectDialogOpen(true)}
                        >
                          {field.value ? (
                            <span className="truncate">
                              {(() => {
                                const curr = exchangeRates.find(
                                  (c) => String(c.dovizTipi) === field.value
                                );
                                if (!curr) return field.value;
                                return curr.dovizIsmi || `Döviz ${curr.dovizTipi}`;
                              })()}
                            </span>
                          ) : (
                            t('productPricingGroupByManagement.selectCurrency')
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                      <CurrencySelectDialog
                        open={currencySelectDialogOpen}
                        onOpenChange={setCurrencySelectDialogOpen}
                        selectedCurrencyCode={field.value}
                        onSelect={(currency) => {
                          field.onChange(String(currency.dovizTipi));
                        }}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="listPrice"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.listPrice')} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                            className={INPUT_STYLE}
                            placeholder={t('productPricingGroupByManagement.enterListPrice')}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.costPrice')} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                            className={INPUT_STYLE}
                            placeholder={t('productPricingGroupByManagement.enterCostPrice')}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="discount1"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.discount1')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                            className={INPUT_STYLE}
                            placeholder={t('productPricingGroupByManagement.enterDiscount1')}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount2"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.discount2')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                            className={INPUT_STYLE}
                            placeholder={t('productPricingGroupByManagement.enterDiscount2')}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount3"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.discount3')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                            className={INPUT_STYLE}
                            placeholder={t('productPricingGroupByManagement.enterDiscount3')}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {watchedValues[0] > 0 && (
                  <div className="rounded-xl border border-pink-100 dark:border-pink-500/10 bg-pink-50/50 dark:bg-pink-500/5 p-4">
                    <div className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-1">
                      {t('productPricingGroupByManagement.priceCalculation')}
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('productPricingGroupByManagement.finalPriceAfterDiscounts')}:{' '}
                      <span className="text-pink-600 dark:text-pink-400">
                        {formatPrice(finalPrice, watchedValues[4] || '1', exchangeRates)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-shrink-0 backdrop-blur-sm gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-11 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {t('productPricingGroupByManagement.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  form="product-pricing-group-form"
                  disabled={isLoading || !isFormValid}
                  className="h-11 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-lg shadow-pink-500/20 border-0 px-8"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading
                    ? t('productPricingGroupByManagement.saving')
                    : t('productPricingGroupByManagement.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
