import { type ReactElement, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { pricingRuleLineSchema } from '../schemas/pricing-rule-schema';
import type { PricingRuleLineFormState } from '../types/pricing-rule-types';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import type { KurDto } from '@/services/erp-types';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
// İkonlar
import { 
  Search, 
  X, 
  Box, 
  Hash, 
  Coins, 
  Percent, 
  DollarSign,
  ArrowRight
} from 'lucide-react';

interface PricingRuleLineFormProps {
  line: PricingRuleLineFormState;
  onSave: (line: PricingRuleLineFormState) => void;
  onCancel: () => void;
}

// --- TASARIM SABİTLERİ ---
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

const READONLY_INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-100 dark:bg-white/5 
  border border-slate-200 dark:border-white/5 
  text-slate-500 dark:text-slate-400 text-sm
  cursor-not-allowed
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

export function PricingRuleLineForm({
  line,
  onSave,
  onCancel,
}: PricingRuleLineFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: exchangeRates = [], isLoading: isLoadingRates } = useExchangeRate();
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(pricingRuleLineSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      ...line,
      minQuantity: line.minQuantity ?? 0,
      currencyCode: line.currencyCode ? (typeof line.currencyCode === 'string' ? Number(line.currencyCode) : line.currencyCode) : undefined,
      discountRate1: line.discountRate1 ?? 0,
      discountAmount1: line.discountAmount1 ?? 0,
      discountRate2: line.discountRate2 ?? 0,
      discountAmount2: line.discountAmount2 ?? 0,
      discountRate3: line.discountRate3 ?? 0,
      discountAmount3: line.discountAmount3 ?? 0,
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedFixedUnitPrice = form.watch('fixedUnitPrice');
  const watchedMinQuantity = form.watch('minQuantity');
  const watchedDiscountRate1 = form.watch('discountRate1');
  const watchedDiscountRate2 = form.watch('discountRate2');
  const watchedDiscountRate3 = form.watch('discountRate3');

  useEffect(() => {
    const baseAmount = (watchedFixedUnitPrice ?? 0) * (watchedMinQuantity ?? 0);
    
    if (baseAmount > 0) {
      let currentAmount = baseAmount;
      
      const discountAmount1 = currentAmount * ((watchedDiscountRate1 ?? 0) / 100);
      currentAmount = currentAmount - discountAmount1;
      
      const discountAmount2 = currentAmount * ((watchedDiscountRate2 ?? 0) / 100);
      currentAmount = currentAmount - discountAmount2;
      
      const discountAmount3 = currentAmount * ((watchedDiscountRate3 ?? 0) / 100);
      
      form.setValue('discountAmount1', discountAmount1, { shouldValidate: false });
      form.setValue('discountAmount2', discountAmount2, { shouldValidate: false });
      form.setValue('discountAmount3', discountAmount3, { shouldValidate: false });
    } else {
      form.setValue('discountAmount1', 0, { shouldValidate: false });
      form.setValue('discountAmount2', 0, { shouldValidate: false });
      form.setValue('discountAmount3', 0, { shouldValidate: false });
    }
  }, [watchedFixedUnitPrice, watchedMinQuantity, watchedDiscountRate1, watchedDiscountRate2, watchedDiscountRate3, form]);

  const handleSubmit = (data: unknown): void => {
    const formData = data as PricingRuleLineFormState;

    const savedData: PricingRuleLineFormState = {
      ...formData,
      id: line.id,
      minQuantity: formData.minQuantity ?? 0,
      currencyCode: typeof formData.currencyCode === 'number' ? formData.currencyCode : (formData.currencyCode ? Number(formData.currencyCode) : undefined),
      discountRate1: formData.discountRate1 ?? 0,
      discountAmount1: formData.discountAmount1 ?? 0,
      discountRate2: formData.discountRate2 ?? 0,
      discountAmount2: formData.discountAmount2 ?? 0,
      discountRate3: formData.discountRate3 ?? 0,
      discountAmount3: formData.discountAmount3 ?? 0,
    };

    onSave(savedData);
  };

  const handleProductSelect = (product: ProductSelectionResult): void => {
    form.setValue('stokCode', product.code);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 p-4 md:p-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#130822] shadow-md"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('pricingRule.lines.section.stock')}
          </p>
          <div className="h-px bg-slate-100 dark:bg-white/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stokCode"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2 lg:col-span-1">
                <FormLabel className={LABEL_STYLE}>
                  <Box size={12} className="text-pink-500" />
                  {t('pricingRule.lines.stokCode')} *
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={t('pricingRule.lines.stokCodePlaceholder')}
                      className={`${INPUT_STYLE} flex-1`}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setProductDialogOpen(true)}
                    title={t('pricingRule.lines.selectProduct')}
                    className="h-11 w-11 shrink-0 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        form.setValue('stokCode', '');
                        form.setValue('fixedUnitPrice', undefined);
                      }}
                      className="h-11 w-11 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage className="text-red-500 text-[10px] mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_STYLE}>
                  <Hash size={12} className="text-pink-500" />
                  {t('pricingRule.lines.minQuantity')} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    className={INPUT_STYLE}
                  />
                </FormControl>
                <FormMessage className="text-red-500 text-[10px] mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_STYLE}>
                  <Hash size={12} className="text-pink-500" />
                  {t('pricingRule.lines.maxQuantity')} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                    className={INPUT_STYLE}
                  />
                </FormControl>
                <FormMessage className="text-red-500 text-[10px] mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currencyCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_STYLE}>
                  <Coins size={12} className="text-pink-500" />
                  {t('pricingRule.lines.currencyCode')} *
                </FormLabel>
                <VoiceSearchCombobox
                  options={exchangeRates.map((currency: KurDto) => ({
                    value: String(currency.dovizTipi),
                    label: currency.dovizIsmi ? `${currency.dovizIsmi} (${currency.dovizTipi})` : `Döviz (${currency.dovizTipi})`
                  }))}
                  value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                  onSelect={(value) => field.onChange(value ? Number(value) : undefined)}
                  placeholder={isLoadingRates ? t('pricingRule.loading') : t('pricingRule.lines.selectCurrency')}
                  searchPlaceholder={t('pricingRule.lines.searchCurrency')}
                  className={INPUT_STYLE}
                  disabled={isLoadingRates}
                  modal={true}
                />
                <FormMessage className="text-red-500 text-[10px] mt-1" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('pricingRule.lines.section.pricing')}
          </p>
          <div className="h-px bg-slate-100 dark:bg-white/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="fixedUnitPrice"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                    <DollarSign size={12} className="text-pink-500" />
                    {t('pricingRule.lines.fixedUnitPrice')} *
                    </FormLabel>
                    <FormControl>
                    <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                        className={INPUT_STYLE}
                    />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                </FormItem>
                )}
            />

            {/* İndirim 1 */}
            <div className="space-y-3">
                <FormField
                    control={form.control}
                    name="discountRate1"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                        <Percent size={12} className="text-blue-500" />
                        {t('pricingRule.lines.discount1Rate')}
                        </FormLabel>
                        <FormControl>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            className={INPUT_STYLE}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="discountAmount1"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                        <ArrowRight size={12} className="text-slate-400" />
                        {t('pricingRule.lines.discount1Amount')}
                        </FormLabel>
                        <FormControl>
                        <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            className={READONLY_INPUT_STYLE}
                            readOnly
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
            </div>

            {/* İndirim 2 */}
            <FormField
                control={form.control}
                name="discountRate2"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                    <Percent size={12} className="text-indigo-500" />
                    {t('pricingRule.lines.discount2Rate')}
                    </FormLabel>
                    <FormControl>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className={INPUT_STYLE}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
            
            {/* İndirim 3 */}
            <FormField
                control={form.control}
                name="discountRate3"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                    <Percent size={12} className="text-purple-500" />
                    {t('pricingRule.lines.discount3Rate')}
                    </FormLabel>
                    <FormControl>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className={INPUT_STYLE}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="w-full sm:w-auto bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            {t('pricingRule.form.cancel')}
          </Button>
          <Button 
            type="submit"
            disabled={!isFormValid}
            className="w-full sm:w-auto bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold border-0 hover:shadow-lg hover:shadow-pink-500/20 transition-all active:scale-95"
          >
            {t('pricingRule.form.save')}
          </Button>
        </div>
      </form>

      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={handleProductSelect}
        disableRelatedStocks={true}
      />
    </Form>
  );
}
