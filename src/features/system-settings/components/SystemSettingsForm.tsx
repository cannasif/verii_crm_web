import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useEffect, useMemo } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isZodFieldRequired } from '@/lib/zod-required';
import {
  systemSettingsFormSchema,
  type SystemSettingsDto,
  type SystemSettingsFormSchema,
} from '../types/systemSettings';
import { normalizeSystemSettings } from '@/stores/system-settings-store';

const SUPPORTED_DEMAND_ACTIONS = new Set([1, 2, 3, 4, 5]);
const SUPPORTED_QUOTATION_ACTIONS = new Set([1, 2, 3, 4, 5, 6]);
const SUPPORTED_ORDER_ACTIONS = new Set([1, 2, 3, 4]);

function normalizeSupportedActionValue(
  value: number | string | undefined,
  supportedValues: Set<number>
): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && supportedValues.has(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    if (Number.isInteger(numericValue) && supportedValues.has(numericValue)) {
      return numericValue;
    }
  }

  return undefined;
}

interface SystemSettingsFormProps {
  data: SystemSettingsDto | undefined;
  isLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (data: SystemSettingsFormSchema) => void | Promise<void>;
}

export function SystemSettingsForm({
  data,
  isLoading,
  isSubmitting,
  onSubmit,
}: SystemSettingsFormProps): ReactElement {
  const { t } = useTranslation();

  const getSelectedOptionLabel = (
    options: Array<{ value: string; label: string }>,
    value: number | string | undefined
  ): string | undefined => options.find((option) => option.value === String(value))?.label;

  const numberFormatOptions = useMemo(
    () => [
      { value: 'tr-TR', label: t('systemSettings.NumberFormatOptions.trTR') },
      { value: 'en-US', label: t('systemSettings.NumberFormatOptions.enUS') },
      { value: 'de-DE', label: t('systemSettings.NumberFormatOptions.deDE') },
    ],
    [t]
  );

  const demandActionOptions = useMemo(
    () => [1, 2, 3, 4, 5].map((value) => ({
      value: String(value),
      label: t(`systemSettings.ApprovalCompletionActions.Demand.${value}`),
    })),
    [t]
  );

  const quotationActionOptions = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((value) => ({
      value: String(value),
      label: t(`systemSettings.ApprovalCompletionActions.Quotation.${value}`),
    })),
    [t]
  );

  const orderActionOptions = useMemo(
    () => [1, 2, 3, 4].map((value) => ({
      value: String(value),
      label: t(`systemSettings.ApprovalCompletionActions.Order.${value}`),
    })),
    [t]
  );

  const form = useForm<SystemSettingsFormSchema>({
    resolver: zodResolver(systemSettingsFormSchema) as Resolver<SystemSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      numberFormat: 'tr-TR',
      decimalPlaces: 2,
      restrictCustomersBySalesRepMatch: false,
      demandApprovalCompletionAction: 1,
      quotationApprovalCompletionAction: 1,
      orderApprovalCompletionAction: 1,
    },
  });

  const demandActionValue = form.watch('demandApprovalCompletionAction');
  const quotationActionValue = form.watch('quotationApprovalCompletionAction');
  const orderActionValue = form.watch('orderApprovalCompletionAction');

  useEffect(() => {
    if (!data) return;
    const normalizedData = normalizeSystemSettings(data);
    form.reset({
      numberFormat: normalizedData.numberFormat,
      decimalPlaces: normalizedData.decimalPlaces,
      restrictCustomersBySalesRepMatch: normalizedData.restrictCustomersBySalesRepMatch,
      demandApprovalCompletionAction: normalizedData.demandApprovalCompletionAction ?? 1,
      quotationApprovalCompletionAction: normalizedData.quotationApprovalCompletionAction ?? 1,
      orderApprovalCompletionAction: normalizedData.orderApprovalCompletionAction ?? 1,
    });
  }, [data, form]);

  useEffect(() => {
    const normalizedValue = normalizeSupportedActionValue(demandActionValue, SUPPORTED_DEMAND_ACTIONS);
    if (normalizedValue === demandActionValue || normalizedValue === undefined) {
      if (normalizedValue !== undefined) return;
    } else {
      form.setValue('demandApprovalCompletionAction', normalizedValue, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    form.setValue('demandApprovalCompletionAction', 1, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [demandActionValue, form]);

  useEffect(() => {
    const normalizedValue = normalizeSupportedActionValue(quotationActionValue, SUPPORTED_QUOTATION_ACTIONS);
    if (normalizedValue === quotationActionValue || normalizedValue === undefined) {
      if (normalizedValue !== undefined) return;
    } else {
      form.setValue('quotationApprovalCompletionAction', normalizedValue, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    form.setValue('quotationApprovalCompletionAction', 1, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, quotationActionValue]);

  useEffect(() => {
    const normalizedValue = normalizeSupportedActionValue(orderActionValue, SUPPORTED_ORDER_ACTIONS);
    if (normalizedValue === orderActionValue || normalizedValue === undefined) {
      if (normalizedValue !== undefined) return;
    } else {
      form.setValue('orderApprovalCompletionAction', normalizedValue, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    form.setValue('orderApprovalCompletionAction', 1, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, orderActionValue]);

  const handleSubmit: SubmitHandler<SystemSettingsFormSchema> = (values) => onSubmit(values);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const headerCardStyle = `
    overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 
    bg-white dark:bg-[#180F22] backdrop-blur-md px-2 py-6 shadow-xl 
    transition-all duration-300 relative
  `;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className={headerCardStyle}>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="numberFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'numberFormat')}>
                    {t('systemSettings.Fields.NumberFormat')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <span>{getSelectedOptionLabel(numberFormatOptions, field.value) ?? t('systemSettings.Placeholders.NumberFormat')}</span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {numberFormatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decimalPlaces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'decimalPlaces')}>
                    {t('systemSettings.Fields.DecimalPlaces')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0516]"
                      type="number"
                      min={0}
                      max={6}
                      step={1}
                      {...field}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          field.onChange(0);
                          return;
                        }

                        const numericValue = Number(rawValue);
                        const clampedValue = Number.isFinite(numericValue)
                          ? Math.min(6, Math.max(0, Math.trunc(numericValue)))
                          : 0;

                        field.onChange(clampedValue);
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        const rawValue = e.target.value;
                        const numericValue = rawValue === '' ? 0 : Number(rawValue);
                        const clampedValue = Number.isFinite(numericValue)
                          ? Math.min(6, Math.max(0, Math.trunc(numericValue)))
                          : 0;

                        form.setValue('decimalPlaces', clampedValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="restrictCustomersBySalesRepMatch"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel required={false}>
                        {t('systemSettings.Fields.RestrictCustomersBySalesRepMatch')}
                      </FormLabel>
                      <p className="text-muted-foreground text-sm">
                        {t('systemSettings.Descriptions.RestrictCustomersBySalesRepMatch')}
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="demandApprovalCompletionAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.Fields.DemandApprovalCompletionAction')}</FormLabel>
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <span>{getSelectedOptionLabel(demandActionOptions, field.value) ?? t('systemSettings.Placeholders.ApprovalCompletionAction')}</span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {demandActionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quotationApprovalCompletionAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.Fields.QuotationApprovalCompletionAction')}</FormLabel>
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <span>{getSelectedOptionLabel(quotationActionOptions, field.value) ?? t('systemSettings.Placeholders.ApprovalCompletionAction')}</span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {quotationActionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderApprovalCompletionAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.Fields.OrderApprovalCompletionAction')}</FormLabel>
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <span>{getSelectedOptionLabel(orderActionOptions, field.value) ?? t('systemSettings.Placeholders.ApprovalCompletionAction')}</span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orderActionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="min-w-[120px] bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
