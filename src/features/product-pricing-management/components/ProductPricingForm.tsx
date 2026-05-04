import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Package,
  Calculator,
  Trash2,
  Layers,
  Banknote,
  Tag,
  Coins,
  Percent,
  Save,
  X
} from 'lucide-react';


import {
  productPricingFormSchema,
  type ProductPricingFormSchema,
  type ProductPricingGetDto,
  calculateFinalPrice,
  calculateProfitMargin,
  formatPrice,
} from '../types/product-pricing-types';
import { isZodFieldRequired } from '@/lib/zod-required';

import { ProductPricingStockSelectDialog } from './ProductPricingStockSelectDialog';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';

import { ChevronDown } from 'lucide-react';

import { Loader2 } from 'lucide-react';

interface ProductPricingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductPricingFormSchema) => void | Promise<void>;
  onDelete?: (id: number) => void;
  productPricing?: ProductPricingGetDto | null;
  isLoading?: boolean;
  excludeProductCodes?: string[];
}

// STİL: Standart yükseklik ve kenarlıklar
const BASE_INPUT = "h-11 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-2 focus-visible:ring-pink-500/20 focus:border-pink-500/50 transition-all duration-300";
const INPUT_STYLE = `${BASE_INPUT} w-full`;
const LABEL_STYLE = "text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-2 flex items-center gap-2";

export function ProductPricingForm({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  productPricing,
  isLoading,
  excludeProductCodes,
}: ProductPricingFormProps): ReactElement {
  const { t, i18n } = useTranslation(['product-pricing-management', 'common']);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [currencySelectDialogOpen, setCurrencySelectDialogOpen] = useState(false);
  const { data: exchangeRates = [] } = useExchangeRate();

  const form = useForm<ProductPricingFormSchema>({
    resolver: zodResolver(productPricingFormSchema) as Resolver<ProductPricingFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      erpProductCode: '', erpGroupCode: '', currency: '1',
      listPrice: 0, costPrice: 0,
      discount1: 0, discount2: 0, discount3: 0
    }
  });
  const isFormValid = form.formState.isValid;

  // Düzenleme modunda verileri doldur
  useEffect(() => {
    if (productPricing) {
      form.reset({
        erpProductCode: productPricing.erpProductCode,
        erpGroupCode: productPricing.erpGroupCode || '',
        currency: productPricing.currency,
        listPrice: productPricing.listPrice,
        costPrice: productPricing.costPrice,
        discount1: productPricing.discount1 || 0,
        discount2: productPricing.discount2 || 0,
        discount3: productPricing.discount3 || 0,
      });
    } else {
      form.reset({
        erpProductCode: '', erpGroupCode: '', currency: '1',
        listPrice: 0, costPrice: 0, discount1: 0, discount2: 0, discount3: 0
      });
    }
  }, [productPricing, form, open]);

  // Anlık Hesaplama
  const values = form.watch();
  const calculations = useMemo(() => {
    const final = calculateFinalPrice(values.listPrice, values.discount1, values.discount2, values.discount3);
    const profit = calculateProfitMargin(final, values.costPrice);
    return { final, profit };
  }, [values.listPrice, values.costPrice, values.discount1, values.discount2, values.discount3]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] sm:w-[calc(50vw-2rem)] !max-w-[96vw] xl:max-w-[1100px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]"
      >
        <DialogHeader className="px-6 sm:px-8 py-2 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <Tag size={24} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {productPricing ? t('edit') : t('create')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {t('createDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:scale-110 shadow-sm"
          >
            <X className="relative z-10" size={20} />
            <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">

              <div className="flex flex-col gap-4">
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-6 sm:p-6 space-y-6">


                    <FormField control={form.control} name="erpProductCode" render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'erpProductCode')}>
                          <Package size={14} className="text-pink-500" /> {t('selectStok')}
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} readOnly placeholder={t('selectStokCode')} className={INPUT_STYLE} />
                          </FormControl>
                          <Button
                            type="button"
                            onClick={() => setProductDialogOpen(true)}
                            className="h-11 shrink-0 bg-linear-to-r from-pink-600 to-orange-600 px-6 font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                          >
                            <Package size={18} className="mr-2" /> {t('common.select', { ns: 'common', defaultValue: 'Seç' })}
                          </Button>
                        </div>
                        <FormMessage className="text-red-500 text-[10px] font-medium" />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="erpGroupCode" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className={LABEL_STYLE}>
                            <Layers size={14} className="text-pink-500" /> {t('searchGroupCode')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className={`${INPUT_STYLE} bg-slate-100/50 dark:bg-white/[0.01] font-mono text-xs`} />
                          </FormControl>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem className="space-y-2 flex flex-col">
                          <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'currency')}>
                            <Banknote size={14} className="text-pink-500" /> {t('currency')}
                          </FormLabel>
                          <Popover open={currencySelectDialogOpen} onOpenChange={setCurrencySelectDialogOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    INPUT_STYLE,
                                    "justify-between font-semibold text-slate-700 dark:text-slate-200",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Coins size={14} className="text-slate-400" />
                                    <span>
                                      {field.value
                                        ? exchangeRates.find(
                                          (c) => String(c.dovizTipi) === field.value
                                        )?.dovizIsmi || field.value
                                        : t('productPricingGroupByManagement.selectCurrency')}
                                    </span>
                                  </div>
                                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1025] shadow-2xl backdrop-blur-xl">
                              <Command className="bg-transparent">
                                <CommandInput placeholder={t('common.search')} className="h-11" />
                                <CommandList className="custom-scrollbar">
                                  <CommandEmpty>{t('common.noData')}</CommandEmpty>
                                  <CommandGroup>
                                    {exchangeRates.map((curr) => (
                                      <CommandItem
                                        key={curr.dovizTipi}
                                        onSelect={() => {
                                          form.setValue("currency", String(curr.dovizTipi), { shouldValidate: true });
                                          setCurrencySelectDialogOpen(false);
                                        }}
                                        className="h-10 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4 text-pink-500",
                                            String(curr.dovizTipi) === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {curr.dovizIsmi}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-red-500 text-[10px] font-medium" />
                        </FormItem>
                      )} />
                    </div>
                  </div>


                </div>


                <div className="space-y-4">
                  <div className="rounded-[2rem] border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-8 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="listPrice" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'listPrice')}>
                            <Tag size={14} className="text-emerald-500" /> Liste Fiyatı
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input type="number" step="0.000001" inputMode="decimal" {...field} className={`${INPUT_STYLE} pl-10 font-bold text-lg`} />
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Coins size={16} />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-[10px] font-medium" />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="costPrice" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'costPrice')}>
                            <Coins size={14} className="text-red-500" /> Maliyet Fiyatı
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input type="number" step="0.000001" inputMode="decimal" {...field} className={`${INPUT_STYLE} pl-10 font-bold text-lg`} />
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors">
                                <Banknote size={16} />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-[10px] font-medium" />
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((num) => (
                          <FormField key={num} control={form.control} name={`discount${num}` as any} render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className={LABEL_STYLE}>
                                <Percent size={12} className="text-orange-500" /> İsk. {num} (%)
                              </FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" inputMode="decimal" {...field} className={`${INPUT_STYLE} text-center font-bold`} />
                              </FormControl>
                            </FormItem>
                          )} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[2rem] border border-pink-500/20 bg-pink-50/30 dark:bg-pink-500/[0.02] p-6 space-y-4">
                    <div className="flex items-center gap-3 text-sm font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest relative z-10">
                      <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <Calculator size={16} />
                      </div>
                      {t('priceCalculation')}
                    </div>

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-white/50 dark:border-white/5">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t('finalPrice')}</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {formatPrice(calculations.final, values.currency, i18n.language)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-white/50 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">{t('profitAmount')}</span>
                          <span className={`text-lg font-bold ${calculations.profit.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatPrice(calculations.profit.amount, values.currency, i18n.language)}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-white/50 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">{t('profitMargin')}</span>
                          <span className={`text-lg font-bold ${calculations.profit.percentage >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            %{calculations.profit.percentage.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-2 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between gap-4 backdrop-blur-sm">
          {productPricing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(productPricing.id)}
              disabled={isLoading}
              className="h-12 px-6 rounded-2xl text-red-500 hover:bg-red-500/10 hover:text-red-600 font-bold transition-all"
            >
              <Trash2 size={18} className="mr-2" /> {t('delete.action', { ns: 'common' })}
            </Button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading || !isFormValid}
              className="h-12 bg-linear-to-r from-pink-600 to-orange-600 px-10 font-black text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-2xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving', { ns: 'common' })}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('save', { ns: 'common' })}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ProductPricingStockSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={(result) => {
          form.setValue('erpProductCode', result.code);
          form.setValue('erpGroupCode', result.groupCode ?? '');
          setProductDialogOpen(false);
        }}
        excludeProductCodes={excludeProductCodes}
      />
    </Dialog>
  );
}
