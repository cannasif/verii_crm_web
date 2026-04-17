import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useEffect, useMemo } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isZodFieldRequired } from '@/lib/zod-required';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import {
  systemSettingsFormSchema,
  type EditableSystemSettingsDto,
  type SystemSettingsDto,
  type SystemSettingsFormSchema,
} from '../types/systemSettings';

const fallbackCurrencyOptions = [
  { value: 'TRY', label: 'TRY - Türk Lirası' },
  { value: 'USD', label: 'USD - Amerikan Doları' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - İngiliz Sterlini' },
];

const numberFormatOptions = [
  { value: 'tr-TR', label: 'Türkçe sayı biçimi (1.234,56)' },
  { value: 'en-US', label: 'US sayı biçimi (1,234.56)' },
  { value: 'de-DE', label: 'Almanca sayı biçimi (1.234,56)' },
];

interface SystemSettingsFormProps {
  data: SystemSettingsDto | undefined;
  isLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (data: EditableSystemSettingsDto) => void | Promise<void>;
}

export function SystemSettingsForm({
  data,
  isLoading,
  isSubmitting,
  onSubmit,
}: SystemSettingsFormProps): ReactElement {
  const { t } = useTranslation();
  const { currencyOptions: erpCurrencyOptions } = useCurrencyOptions();

  const currencyOptions = useMemo(() => {
    if (erpCurrencyOptions.length === 0) {
      return fallbackCurrencyOptions;
    }

    const uniqueOptions = new Map<string, { value: string; label: string }>();

    erpCurrencyOptions.forEach((option) => {
      if (!uniqueOptions.has(option.code)) {
        uniqueOptions.set(option.code, {
          value: option.code,
          label: option.label,
        });
      }
    });

    return Array.from(uniqueOptions.values());
  }, [erpCurrencyOptions]);

  const form = useForm<SystemSettingsFormSchema>({
    resolver: zodResolver(systemSettingsFormSchema) as Resolver<SystemSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      defaultCurrencyCode: 'TRY',
      numberFormat: 'tr-TR',
      decimalPlaces: 2,
      restrictCustomersBySalesRepMatch: false,
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      defaultCurrencyCode: data.defaultCurrencyCode,
      numberFormat: data.numberFormat,
      decimalPlaces: data.decimalPlaces,
      restrictCustomersBySalesRepMatch: data.restrictCustomersBySalesRepMatch,
    });
  }, [data, form]);

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('systemSettings.PageTitle')}</CardTitle>
            <CardDescription>{t('systemSettings.PageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultCurrencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'defaultCurrencyCode')}>
                    {t('systemSettings.Fields.DefaultCurrencyCode')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.DefaultCurrencyCode')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencyOptions.map((option) => (
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
              name="numberFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'numberFormat')}>
                    {t('systemSettings.Fields.NumberFormat')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.NumberFormat')} />
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
                <FormItem className="md:col-span-2">
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'decimalPlaces')}>
                    {t('systemSettings.Fields.DecimalPlaces')}
                  </FormLabel>
                  <FormControl>
                    <Input
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
