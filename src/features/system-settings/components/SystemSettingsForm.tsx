import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useMemo } from 'react';
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

const DEFAULT_FORM_VALUES: SystemSettingsFormSchema = {
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
  demandApprovalCompletionAction: 1,
  quotationApprovalCompletionAction: 1,
  orderApprovalCompletionAction: 1,
};

const DEMAND_ACTION_LABELS: Record<number, string> = {
  1: 'Sadece onaylandı kalsın',
  2: "Netsis'te talep aç",
  3: 'Teklif kaydı aç',
  4: "Netsis'te talep kaydı aç",
  5: "Netsis'te talep aç ve teklif oluştur",
};

const QUOTATION_ACTION_LABELS: Record<number, string> = {
  1: 'Sadece onaylandı kalsın',
  2: "Netsis'te teklif aç",
  3: "CRM'de sipariş kaydı aç",
  4: "Netsis'te sipariş kaydı aç",
  5: "Netsis'te teklif aç ve sipariş oluştur",
  6: "CRM'de sipariş kaydı aç ve Netsis'te sipariş oluştur",
};

const ORDER_ACTION_LABELS: Record<number, string> = {
  1: 'Sadece onaylandı kalsın',
  2: "Netsis'te sipariş aç",
  3: "Netsis'te satış faturası aç",
  4: "Netsis'te sipariş ve satış faturası aç",
};

function resolveActionSelectValue(
  value: number | string | undefined,
  fallback: number,
  options: Array<{ value: string; label: string }>
): number {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (Number.isInteger(numericValue) && options.some((option) => option.value === String(numericValue))) {
    return numericValue as number;
  }

  return fallback;
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
      label: DEMAND_ACTION_LABELS[value],
    })),
    []
  );

  const quotationActionOptions = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((value) => ({
      value: String(value),
      label: QUOTATION_ACTION_LABELS[value],
    })),
    []
  );

  const orderActionOptions = useMemo(
    () => [1, 2, 3, 4].map((value) => ({
      value: String(value),
      label: ORDER_ACTION_LABELS[value],
    })),
    []
  );

  const formValues = useMemo<SystemSettingsFormSchema>(() => {
    if (!data) return DEFAULT_FORM_VALUES;
    const normalizedData = normalizeSystemSettings(data);

    return {
      numberFormat: normalizedData.numberFormat,
      decimalPlaces: normalizedData.decimalPlaces,
      restrictCustomersBySalesRepMatch: normalizedData.restrictCustomersBySalesRepMatch,
      demandApprovalCompletionAction: normalizedData.demandApprovalCompletionAction,
      quotationApprovalCompletionAction: normalizedData.quotationApprovalCompletionAction,
      orderApprovalCompletionAction: normalizedData.orderApprovalCompletionAction,
    };
  }, [data]);

  const form = useForm<SystemSettingsFormSchema>({
    resolver: zodResolver(systemSettingsFormSchema) as Resolver<SystemSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
    values: formValues,
    resetOptions: {
      keepDirtyValues: false,
      keepErrors: false,
    },
  });

  const demandActionValue = resolveActionSelectValue(
    form.watch('demandApprovalCompletionAction'),
    formValues.demandApprovalCompletionAction,
    demandActionOptions
  );
  const quotationActionValue = resolveActionSelectValue(
    form.watch('quotationApprovalCompletionAction'),
    formValues.quotationApprovalCompletionAction,
    quotationActionOptions
  );
  const orderActionValue = resolveActionSelectValue(
    form.watch('orderApprovalCompletionAction'),
    formValues.orderApprovalCompletionAction,
    orderActionOptions
  );

  const setActionValue = (
    fieldName:
      | 'demandApprovalCompletionAction'
      | 'quotationApprovalCompletionAction'
      | 'orderApprovalCompletionAction',
    value: string
  ) => {
    form.setValue(fieldName, Number(value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

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

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t('systemSettings.Fields.DemandApprovalCompletionAction')}
              </label>
              <Select
                value={String(demandActionValue)}
                onValueChange={(value) => setActionValue('demandApprovalCompletionAction', value)}
              >
                <SelectTrigger>
                  <span>{getSelectedOptionLabel(demandActionOptions, demandActionValue)}</span>
                </SelectTrigger>
                <SelectContent>
                  {demandActionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t('systemSettings.Fields.QuotationApprovalCompletionAction')}
              </label>
              <Select
                value={String(quotationActionValue)}
                onValueChange={(value) => setActionValue('quotationApprovalCompletionAction', value)}
              >
                <SelectTrigger>
                  <span>{getSelectedOptionLabel(quotationActionOptions, quotationActionValue)}</span>
                </SelectTrigger>
                <SelectContent>
                  {quotationActionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t('systemSettings.Fields.OrderApprovalCompletionAction')}
              </label>
              <Select
                value={String(orderActionValue)}
                onValueChange={(value) => setActionValue('orderApprovalCompletionAction', value)}
              >
                <SelectTrigger>
                  <span>{getSelectedOptionLabel(orderActionOptions, orderActionValue)}</span>
                </SelectTrigger>
                <SelectContent>
                  {orderActionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
