import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { WandSparkles, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { ProductCategoryRuleCreateDto, ProductCategoryRuleDto } from '../types/category-definition-types';

interface CategoryRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductCategoryRuleCreateDto) => Promise<void> | void;
  isLoading?: boolean;
  initialData?: ProductCategoryRuleDto | null;
  categoryName?: string | null;
  catalogId?: number | null;
  catalogCategoryId?: number | null;
}

const DEFAULT_FORM: ProductCategoryRuleCreateDto = {
  ruleName: '',
  ruleCode: '',
  stockAttributeType: 3,
  operatorType: 1,
  value: '',
  priority: 0,
};

const STOCK_ATTRIBUTE_OPTIONS = [
  { value: 1, labelKey: 'groupCode' },
  { value: 2, labelKey: 'groupName' },
  { value: 3, labelKey: 'code1' },
  { value: 4, labelKey: 'code1Name' },
  { value: 5, labelKey: 'code2' },
  { value: 6, labelKey: 'code2Name' },
  { value: 7, labelKey: 'code3' },
  { value: 8, labelKey: 'code3Name' },
  { value: 9, labelKey: 'code4' },
  { value: 10, labelKey: 'code4Name' },
  { value: 11, labelKey: 'code5' },
  { value: 12, labelKey: 'code5Name' },
  { value: 13, labelKey: 'manufacturerCode' },
  { value: 14, labelKey: 'erpStockCode' },
  { value: 15, labelKey: 'stockName' },
] as const;

const OPERATOR_OPTIONS = [
  { value: 1, labelKey: 'equals' },
  { value: 2, labelKey: 'contains' },
  { value: 3, labelKey: 'startsWith' },
  { value: 4, labelKey: 'endsWith' },
  { value: 5, labelKey: 'inList' },
] as const;

export function CategoryRuleDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  initialData,
  categoryName,
  catalogId,
  catalogCategoryId,
}: CategoryRuleDialogProps): ReactElement {
  const { t } = useTranslation(['category-definitions', 'common']);
  const [form, setForm] = useState<ProductCategoryRuleCreateDto>(DEFAULT_FORM);
  const [valueSearch, setValueSearch] = useState('');
  const requiredMark = <span className="ml-1 text-destructive">*</span>;
  const debouncedValueSearch = useDebouncedValue(valueSearch, 250);

  useEffect(() => {
    if (open) {
      setForm(initialData ? {
        ruleName: initialData.ruleName,
        ruleCode: initialData.ruleCode ?? '',
        stockAttributeType: initialData.stockAttributeType,
        operatorType: initialData.operatorType,
        value: initialData.value,
        priority: initialData.priority,
      } : DEFAULT_FORM);
      setValueSearch('');
    }
  }, [initialData, open]);

  const isListOperator = form.operatorType === 5;
  const supportsSuggestedValues = form.operatorType === 1 || form.operatorType === 5;

  const valueOptionsQuery = useQuery({
    queryKey: ['category-rule-value-options', catalogId, catalogCategoryId, form.stockAttributeType, debouncedValueSearch],
    queryFn: () => categoryDefinitionsApi.getCategoryRuleValueOptions(
      catalogId!,
      catalogCategoryId!,
      form.stockAttributeType,
      debouncedValueSearch
    ),
    enabled: open && supportsSuggestedValues && catalogId != null && catalogCategoryId != null,
  });

  const valueOptions = valueOptionsQuery.data ?? [];
  const selectedListValues = useMemo(
    () => form.value.split(',').map((x) => x.trim()).filter(Boolean),
    [form.value]
  );

  const comboboxOptions = valueOptions.map((option) => ({
    value: option.value,
    label: `${option.value} (${option.usageCount})`,
  }));
  const topUsageOptions = valueOptions.slice(0, 8);

  const addListValue = (value: string): void => {
    const normalized = value.trim();
    if (!normalized) return;

    setForm((prev) => {
      const current = prev.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }

      return {
        ...prev,
        value: [...current, normalized].join(','),
      };
    });
  };

  const removeListValue = (value: string): void => {
    setForm((prev) => ({
      ...prev,
      value: prev.value
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x && x.toLowerCase() !== value.toLowerCase())
        .join(','),
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    await onSubmit({
      ruleName: form.ruleName.trim(),
      ruleCode: form.ruleCode?.trim() || null,
      stockAttributeType: form.stockAttributeType,
      operatorType: form.operatorType,
      value: form.value.trim(),
      priority: Number(form.priority) || 0,
    });
  };

  const isDisabled = isLoading || !form.ruleName.trim() || !form.value.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[840px] max-h-[calc(100dvh-1.5rem)] p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <WandSparkles className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initialData ? t('categoryDefinitions.editRuleTitle') : t('categoryDefinitions.createRuleTitle')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initialData
                  ? t('categoryDefinitions.editRuleDescription', { category: categoryName ?? '-' })
                  : t('categoryDefinitions.createRuleDescription', { category: categoryName ?? '-' })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.ruleName')}{requiredMark}</label>
              <Input
                required
                aria-required="true"
                value={form.ruleName}
                onChange={(e) => setForm((p) => ({ ...p, ruleName: e.target.value }))}
                className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.ruleCode')}</label>
              <Input
                value={form.ruleCode ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, ruleCode: e.target.value.toUpperCase() }))}
                className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono uppercase tracking-wider font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.stockAttribute')}{requiredMark}</label>
              <Select value={String(form.stockAttributeType)} onValueChange={(value) => setForm((p) => ({ ...p, stockAttributeType: Number(value) }))}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-medium"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                  {STOCK_ATTRIBUTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">
                      {t(`categoryDefinitions.ruleAttributes.${option.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.operator')}{requiredMark}</label>
              <Select value={String(form.operatorType)} onValueChange={(value) => setForm((p) => ({ ...p, operatorType: Number(value) }))}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-medium"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                  {OPERATOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">
                      {t(`categoryDefinitions.ruleOperators.${option.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.ruleValue')}{requiredMark}</label>
              {supportsSuggestedValues ? (
                <div className="space-y-3">
                  <Combobox
                    options={comboboxOptions}
                    value={isListOperator ? '' : form.value}
                    onValueChange={(value) => {
                      if (isListOperator) {
                        addListValue(value);
                        setValueSearch('');
                        return;
                      }
                      setForm((p) => ({ ...p, value }));
                    }}
                    placeholder={t('categoryDefinitions.form.ruleValueDropdownPlaceholder')}
                    searchPlaceholder={t('categoryDefinitions.form.ruleValueSearchPlaceholder')}
                    emptyText={valueOptionsQuery.isLoading
                      ? t('categoryDefinitions.form.ruleValueLoading')
                      : t('categoryDefinitions.form.ruleValueEmpty')}
                    disabled={valueOptionsQuery.isLoading}
                  />

                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {isListOperator
                      ? t('categoryDefinitions.form.ruleValueInListHelp')
                      : t('categoryDefinitions.form.ruleValueDropdownHelp')}
                  </p>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('categoryDefinitions.form.ruleValueTopMatchesTitle')}
                      </p>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {t('categoryDefinitions.form.ruleValueTopMatchesSubtitle')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topUsageOptions.length > 0 ? topUsageOptions.map((option) => (
                        <Badge
                          key={`${form.stockAttributeType}-${option.value}`}
                          variant="outline"
                          className="cursor-pointer rounded-full px-3 py-1 text-xs border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors font-semibold"
                          onClick={() => {
                            if (isListOperator) {
                              addListValue(option.value);
                              return;
                            }
                            setForm((prev) => ({ ...prev, value: option.value }));
                          }}
                        >
                          {option.value} ({option.usageCount})
                        </Badge>
                      )) : (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {t('categoryDefinitions.form.ruleValueTopMatchesEmpty')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isListOperator ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50/50 dark:bg-pink-500/5 p-4">
                      {selectedListValues.length > 0 ? selectedListValues.map((value) => (
                        <Badge
                          key={value}
                          variant="secondary"
                          className="cursor-pointer rounded-full font-semibold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
                          onClick={() => removeListValue(value)}
                        >
                          {value} ×
                        </Badge>
                      )) : (
                        <span className="text-xs font-medium text-pink-500 dark:text-pink-400">
                          {t('categoryDefinitions.form.ruleValueInListEmpty')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Input
                      value={form.value}
                      onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                      placeholder={t('categoryDefinitions.form.ruleValueDropdownPlaceholder')}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder={t('categoryDefinitions.form.ruleValuePlaceholder')}
                    className="rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium resize-none"
                  />
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {t('categoryDefinitions.form.ruleValueManualHelp')}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('categoryDefinitions.form.priority')}</label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3 shrink-0">
          <div className="flex-1 flex items-center text-xs font-semibold text-slate-400">
            <span className="text-pink-500 mr-1">*</span> {t('common.required')}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isDisabled}
            className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-30 disabled:hover:scale-100 px-8 h-11"
          >
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
