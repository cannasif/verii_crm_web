import { type ReactElement, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCustomersForPricingRule } from '../hooks/useCustomersForPricingRule';
import { CustomerSelectDialog, type CustomerSelectionResult } from '@/components/shared';
import { PricingRuleType, type PricingRuleFormSchema } from '../types/pricing-rule-types';
import { Button } from '@/components/ui/button';
import { type ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
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

import {
  Check,
  ChevronDown,
  Search,
  List,
  Hash,
  Type,
  Calendar,
  Building2,
} from 'lucide-react';

const INPUT_STYLE = "h-11 rounded-xl bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/20 focus-visible:border-pink-500 transition-all duration-200 text-sm font-medium";
const LABEL_STYLE = "text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-2";

export function PricingRuleHeaderForm(): ReactElement {
  const { t } = useTranslation();
  const form = useFormContext<PricingRuleFormSchema>();
  const { data: customers } = useCustomersForPricingRule();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [ruleTypePopoverOpen, setRuleTypePopoverOpen] = useState(false);

  const handleCustomerSelect = (result: CustomerSelectionResult): void => {
    form.setValue('customerId', result.customerId ?? null);
    form.setValue('erpCustomerCode', result.erpCustomerCode ?? null);
  };

  const customerId = form.watch('customerId');
  const erpCustomerCode = form.watch('erpCustomerCode');

  const selectedCustomer = customers?.find((c) => c.id === customerId);
  const displayValue = selectedCustomer
    ? (selectedCustomer.customerCode?.trim()
      ? `ERP: ${selectedCustomer.customerCode} - ${selectedCustomer.name}`
      : `CRM: ${selectedCustomer.name}`)
    : erpCustomerCode
      ? `ERP: ${erpCustomerCode}`
      : '';

  const ruleTypeOptions: ComboboxOption[] = [
    { value: PricingRuleType.Demand.toString(), label: t('pricingRule.ruleType.demand') },
    { value: PricingRuleType.Quotation.toString(), label: t('pricingRule.ruleType.quotation') },
    { value: PricingRuleType.Order.toString(), label: t('pricingRule.ruleType.order') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. Kural Temel Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control}
          name="ruleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_STYLE}>
                <List size={12} className="text-pink-500" />
                {t('pricingRule.header.ruleType')} <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <Popover open={ruleTypePopoverOpen} onOpenChange={setRuleTypePopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        INPUT_STYLE,
                        "w-full justify-between px-3",
                        !field.value && "text-slate-400 dark:text-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {field.value ? (
                          <span className="font-bold">
                            {ruleTypeOptions.find((o) => o.value === field.value.toString())?.label}
                          </span>
                        ) : (
                          t('pricingRule.header.ruleTypePlaceholder')
                        )}
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
                        {ruleTypeOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={() => {
                              field.onChange(parseInt(option.value));
                              setRuleTypePopoverOpen(false);
                            }}
                            className="h-10 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-500",
                                option.value === field.value?.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ruleCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_STYLE}>
                <Hash size={12} className="text-pink-500" />
                {t('pricingRule.header.ruleCode')} <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('pricingRule.header.ruleCodePlaceholder')}
                  maxLength={50}
                  className={INPUT_STYLE}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="ruleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_STYLE}>
                  <Type size={12} className="text-pink-500" />
                  {t('pricingRule.header.ruleName')} <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('pricingRule.header.ruleNamePlaceholder')}
                    maxLength={250}
                    className={INPUT_STYLE}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 2. Tarih ve Müşteri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_STYLE}>
                <Calendar size={12} className="text-pink-500" />
                {t('pricingRule.header.validFrom')} <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  className={INPUT_STYLE}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_STYLE}>
                <Calendar size={12} className="text-pink-500" />
                {t('pricingRule.header.validTo')} <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  className={INPUT_STYLE}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2">
          <FormItem>
            <FormLabel className={LABEL_STYLE}>
              <Building2 size={12} className="text-pink-500" />
              {t('pricingRule.header.customer')}
            </FormLabel>
            <div className="flex gap-2">
              <Input
                readOnly
                value={displayValue}
                placeholder={t('pricingRule.header.customerPlaceholder')}
                className={`${INPUT_STYLE} flex-1`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                onClick={() => setCustomerDialogOpen(true)}
                title={t('pricingRule.header.selectCustomer')}
              >
                <Search className="h-4 w-4" />
              </Button>
              {(customerId || erpCustomerCode) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => {
                    form.setValue('customerId', null);
                    form.setValue('erpCustomerCode', null);
                  }}
                  title={t('pricingRule.header.clearCustomer')}
                >
                  <Search className="h-4 w-4 rotate-45" />
                </Button>
              )}
            </div>
          </FormItem>
        </div>
      </div>

      <CustomerSelectDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}
