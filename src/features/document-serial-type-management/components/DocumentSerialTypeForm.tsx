import { type ReactElement, useEffect, useState } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentSerialTypeFormSchema, type DocumentSerialTypeFormSchema } from '../types/document-serial-type-types';
import type { DocumentSerialTypeDto } from '../types/document-serial-type-types';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useCustomerTypeOptionsInfinite,
  useUserOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { FileText, Loader2, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface DocumentSerialTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentSerialTypeFormSchema) => void | Promise<void>;
  documentSerialType?: DocumentSerialTypeDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-pink-500/60 dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function DocumentSerialTypeForm({
  open,
  onOpenChange,
  onSubmit,
  documentSerialType,
  isLoading = false,
}: DocumentSerialTypeFormProps): ReactElement {
  const { t } = useTranslation();
  const [customerTypeSearchTerm, setCustomerTypeSearchTerm] = useState('');
  const [salesRepSearchTerm, setSalesRepSearchTerm] = useState('');
  const customerTypeDropdown = useCustomerTypeOptionsInfinite(customerTypeSearchTerm, open);
  const salesRepDropdown = useUserOptionsInfinite(salesRepSearchTerm, open);

  const form = useForm<DocumentSerialTypeFormSchema>({
    resolver: zodResolver(documentSerialTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      ruleType: PricingRuleType.Demand,
      customerTypeId: null,
      salesRepId: null,
      serialPrefix: '',
      serialLength: 1,
      serialStart: 0,
      serialCurrent: 0,
      serialIncrement: 1,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (documentSerialType) {
      form.reset({
        ruleType: documentSerialType.ruleType,
        customerTypeId: documentSerialType.customerTypeId ?? null,
        salesRepId: documentSerialType.salesRepId ?? null,
        serialPrefix: documentSerialType.serialPrefix ?? '',
        serialLength: documentSerialType.serialLength ?? 1,
        serialStart: documentSerialType.serialStart ?? 0,
        serialCurrent: documentSerialType.serialCurrent ?? 0,
        serialIncrement: documentSerialType.serialIncrement ?? 1,
      });
    } else {
      form.reset({
        ruleType: PricingRuleType.Demand,
        customerTypeId: null,
        salesRepId: null,
        serialPrefix: '',
        serialLength: 1,
        serialStart: 0,
        serialCurrent: 0,
        serialIncrement: 1,
      });
    }
  }, [documentSerialType, form]);

  const handleSubmit = async (data: DocumentSerialTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[800px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">
        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <FileText size={24} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editTitle')
                  : t('documentSerialTypeManagement.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editDescription')
                  : t('documentSerialTypeManagement.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
          >
            <X size={20} className="relative z-10" />
            <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100  transition-opacity" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ruleType"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'ruleType')}>
                        {t('documentSerialTypeManagement.form.ruleType')}
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className={`${INPUT_STYLE} w-full flex items-center`}>
                            <SelectValue placeholder={t('documentSerialTypeManagement.form.selectRuleType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PricingRuleType.Demand.toString()}>
                            {t('pricingRule.ruleType.demand')}
                          </SelectItem>
                          <SelectItem value={PricingRuleType.Quotation.toString()}>
                            {t('pricingRule.ruleType.quotation')}
                          </SelectItem>
                          <SelectItem value={PricingRuleType.Order.toString()}>
                            {t('pricingRule.ruleType.order')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerTypeId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('documentSerialTypeManagement.form.customerType')}
                      </FormLabel>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={customerTypeDropdown.options}
                          value={field.value != null ? String(field.value) : ''}
                          onSelect={(v) => field.onChange(v ? Number(v) : null)}
                          onDebouncedSearchChange={setCustomerTypeSearchTerm}
                          onFetchNextPage={customerTypeDropdown.fetchNextPage}
                          hasNextPage={customerTypeDropdown.hasNextPage}
                          isLoading={customerTypeDropdown.isLoading}
                          isFetchingNextPage={customerTypeDropdown.isFetchingNextPage}
                          placeholder={t('documentSerialTypeManagement.form.selectCustomerType')}
                          searchPlaceholder={t('documentSerialTypeManagement.form.searchCustomerType')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="salesRepId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('documentSerialTypeManagement.form.salesRep')}
                      </FormLabel>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={salesRepDropdown.options}
                          value={field.value != null ? String(field.value) : ''}
                          onSelect={(v) => field.onChange(v ? Number(v) : null)}
                          onDebouncedSearchChange={setSalesRepSearchTerm}
                          onFetchNextPage={salesRepDropdown.fetchNextPage}
                          hasNextPage={salesRepDropdown.hasNextPage}
                          isLoading={salesRepDropdown.isLoading}
                          isFetchingNextPage={salesRepDropdown.isFetchingNextPage}
                          placeholder={t('documentSerialTypeManagement.form.selectSalesRep')}
                          searchPlaceholder={t('documentSerialTypeManagement.form.searchSalesRep')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialPrefix"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialPrefix')}>
                        {t('documentSerialTypeManagement.form.serialPrefix')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value}
                          className={INPUT_STYLE}
                          placeholder={t('documentSerialTypeManagement.form.serialPrefixPlaceholder')}
                          maxLength={50}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serialLength"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialLength')}>
                        {t('documentSerialTypeManagement.form.serialLength')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          placeholder={t('documentSerialTypeManagement.form.serialLengthPlaceholder')}
                          className={INPUT_STYLE}
                          min={1}
                          max={100}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialIncrement"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialIncrement')}>
                        {t('documentSerialTypeManagement.form.serialIncrement')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          placeholder={t('documentSerialTypeManagement.form.serialIncrementPlaceholder')}
                          className={INPUT_STYLE}
                          min={1}
                          max={100}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serialStart"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialStart')}>
                        {t('documentSerialTypeManagement.form.serialStart')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          placeholder={t('documentSerialTypeManagement.form.serialStartPlaceholder')}
                          className={INPUT_STYLE}
                          min={0}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialCurrent"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialCurrent')}>
                        {t('documentSerialType.form.serialCurrent')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          placeholder={t('documentSerialType.form.serialCurrentPlaceholder')}
                          className={INPUT_STYLE}
                          min={0}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('common.cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isLoading || !isFormValid}
            className="h-12 px-10 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving', { ns: 'common' })}
              </>
            ) : t('common.save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
