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
import { Package, ChevronDown, Loader2, Check, Banknote, Coins } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { productPricingGroupByFormSchema, type ProductPricingGroupByFormSchema, calculateFinalPrice, formatPrice } from '../types/product-pricing-group-by-types';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useStokGroup } from '@/services/hooks/useStokGroup';
import type { ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';
import { StockGroupSelectDialog } from '@/components/shared/StockGroupSelectDialog';
import { Cancel01Icon } from 'hugeicons-react';

interface ProductPricingGroupByFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductPricingGroupByFormSchema) => void | Promise<void>;
  productPricingGroupBy?: ProductPricingGroupByDto | null;
  isLoading?: boolean;
  excludeGroupCodes?: string[];
}

const INPUT_STYLE = "h-11 rounded-xl bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/20 focus-visible:border-pink-500 transition-all duration-200 text-sm font-medium";
const LABEL_STYLE = "text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-2";

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
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[900px] flex flex-col p-0 dark:bg-[#130822]/95 border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl rounded-[2.5rem] backdrop-blur-xl max-h-[90vh] h-auto overflow-hidden"
      >
        <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md flex-shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-600 p-3 shadow-lg shadow-pink-500/20 text-white flex items-center justify-center">
              <Package size={24} />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {productPricingGroupBy
                  ? t('productPricingGroupByManagement.edit')
                  : t('productPricingGroupByManagement.create')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {productPricingGroupBy
                  ? t('productPricingGroupByManagement.editDescription')
                  : t('productPricingGroupByManagement.createDescription')}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="group h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:scale-110 shadow-sm"
          >
            <Cancel01Icon size={20} className="relative z-10" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Form {...form}>
            <form id="product-pricing-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col min-h-0">
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="erpGroupCode"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          <Package size={14} className="text-pink-500" />
                          {t('productPricingGroupByManagement.erpGroupCode')} <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              INPUT_STYLE,
                              "w-full justify-between px-3 font-semibold",
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
                        <FormMessage className="text-red-500 text-[10px] mt-1 font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="space-y-0 flex flex-col">
                        <FormLabel className={LABEL_STYLE}>
                          <Banknote size={14} className="text-pink-500" />
                          {t('productPricingGroupByManagement.currency')} <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <Popover open={currencySelectDialogOpen} onOpenChange={setCurrencySelectDialogOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  INPUT_STYLE,
                                  "w-full justify-between px-3 font-semibold",
                                  !field.value && "text-slate-400 dark:text-slate-600"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate font-bold">
                                  <Coins size={14} className="text-slate-400" />
                                  <span>
                                    {field.value ? (
                                      exchangeRates.find(
                                        (c) => String(c.dovizTipi) === field.value
                                      )?.dovizIsmi || field.value
                                    ) : (
                                      t('productPricingGroupByManagement.selectCurrency')
                                    )}
                                  </span>
                                </div>
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                        <FormMessage className="text-red-500 text-[10px] mt-1 font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="listPrice"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          {t('productPricingGroupByManagement.listPrice')} <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
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
                          {t('productPricingGroupByManagement.costPrice')} <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
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
                            step="0.000001"
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
                            step="0.000001"
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
                            step="0.000001"
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
                  <div className="relative overflow-hidden rounded-[2rem] border border-pink-500/20 bg-pink-50/30 dark:bg-pink-500/[0.02] p-8 space-y-6">
                    <div className="flex items-center gap-3 text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest relative z-10">
                      <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <Package size={16} />
                      </div>
                      {t('productPricingGroupByManagement.priceCalculation')}
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-white/50 dark:bg-white/[0.03] border border-white/50 dark:border-white/5 relative z-10">
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        {t('productPricingGroupByManagement.finalPriceAfterDiscounts')}
                      </span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatPrice(finalPrice, watchedValues[4] || '1', exchangeRates)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 shrink-0 backdrop-blur-sm gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
                >
                  {t('productPricingGroupByManagement.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="product-pricing-group-form"
                  disabled={isLoading || !isFormValid}
                  className="h-12 px-10 bg-linear-to-r from-pink-600 to-orange-600 rounded-2xl text-white font-black shadow-lg shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] border-0 opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('productPricingGroupByManagement.saving')}
                    </>
                  ) : (
                    t('productPricingGroupByManagement.save')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
