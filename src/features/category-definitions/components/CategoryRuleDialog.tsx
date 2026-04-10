import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[680px] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {initialData ? t('categoryDefinitions.editRuleTitle') : t('categoryDefinitions.createRuleTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {initialData
              ? t('categoryDefinitions.editRuleDescription', { category: categoryName ?? '-' })
              : t('categoryDefinitions.createRuleDescription', { category: categoryName ?? '-' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.ruleName')}{requiredMark}</label>
              <Input required aria-required="true" value={form.ruleName} onChange={(e) => setForm((p) => ({ ...p, ruleName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.ruleCode')}</label>
              <Input value={form.ruleCode ?? ''} onChange={(e) => setForm((p) => ({ ...p, ruleCode: e.target.value.toUpperCase() }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.stockAttribute')}{requiredMark}</label>
              <Select value={String(form.stockAttributeType)} onValueChange={(value) => setForm((p) => ({ ...p, stockAttributeType: Number(value) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_ATTRIBUTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {t(`categoryDefinitions.ruleAttributes.${option.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.operator')}{requiredMark}</label>
              <Select value={String(form.operatorType)} onValueChange={(value) => setForm((p) => ({ ...p, operatorType: Number(value) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {t(`categoryDefinitions.ruleOperators.${option.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.ruleValue')}{requiredMark}</label>
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

                  <p className="text-xs text-muted-foreground">
                    {isListOperator
                      ? t('categoryDefinitions.form.ruleValueInListHelp')
                      : t('categoryDefinitions.form.ruleValueDropdownHelp')}
                  </p>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        {t('categoryDefinitions.form.ruleValueTopMatchesTitle')}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {t('categoryDefinitions.form.ruleValueTopMatchesSubtitle')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topUsageOptions.length > 0 ? topUsageOptions.map((option) => (
                        <Badge
                          key={`${form.stockAttributeType}-${option.value}`}
                          variant="outline"
                          className="cursor-pointer rounded-full px-3 py-1 text-xs"
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
                        <span className="text-xs text-muted-foreground">
                          {t('categoryDefinitions.form.ruleValueTopMatchesEmpty')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isListOperator ? (
                    <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-white/10">
                      {selectedListValues.length > 0 ? selectedListValues.map((value) => (
                        <Badge
                          key={value}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeListValue(value)}
                        >
                          {value} ×
                        </Badge>
                      )) : (
                        <span className="text-xs text-muted-foreground">
                          {t('categoryDefinitions.form.ruleValueInListEmpty')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Input
                      value={form.value}
                      onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                      placeholder={t('categoryDefinitions.form.ruleValueDropdownPlaceholder')}
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
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('categoryDefinitions.form.ruleValueManualHelp')}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.priority')}</label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-1 text-xs text-muted-foreground">
          <span className="text-destructive">*</span> {t('common.required')}
        </div>

        <DialogFooter className="border-t bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isDisabled}>
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
