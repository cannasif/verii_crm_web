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
import { FileText } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface DocumentSerialTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentSerialTypeFormSchema) => void | Promise<void>;
  documentSerialType?: DocumentSerialTypeDto | null;
  isLoading?: boolean;
}

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

  const inputClass = "h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all duration-300";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <DialogHeader className="p-6 pb-2 space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center border border-pink-500/20">
              <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-foreground">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editTitle')
                  : t('documentSerialTypeManagement.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-muted-foreground text-base">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editDescription')
                  : t('documentSerialTypeManagement.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'ruleType')}>
                      {t('documentSerialTypeManagement.form.ruleType')}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className={inputClass}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                        className="h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salesRepId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                        className="h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialPrefix"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialPrefix')}>
                      {t('documentSerialTypeManagement.form.serialPrefix')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value}
                        className={inputClass}
                        placeholder={t('documentSerialTypeManagement.form.serialPrefixPlaceholder')}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialLength"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialLength')}>
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
                        className={inputClass}
                        min={1}
                        max={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialIncrement"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialIncrement')}>
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
                        className={inputClass}
                        min={1}
                        max={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialStart"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialStart')}>
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
                        className={inputClass}
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialCurrent"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialCurrent')}>
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
                        className={inputClass}
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 px-6 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {t('documentSerialTypeManagement.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !isFormValid}
                className="h-11 px-8 bg-linear-to-r from-pink-600 to-orange-600 text-white font-semibold shadow-lg shadow-pink-500/20 hover:scale-[1.02] transition-transform"
              >
                {isLoading
                  ? t('documentSerialTypeManagement.saving')
                  : t('documentSerialTypeManagement.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
