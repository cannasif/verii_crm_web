import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2, PlugZap, XCircle } from 'lucide-react';
import type { ApiResponse } from '@/types/api';
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
import {
  systemSettingsFormSchema,
  type ErpConnectionTestResultDto,
  type SystemSettingsDto,
  type SystemSettingsFormSchema,
  type UpdateSystemSettingsDto,
} from '../types/systemSettings';
import { normalizeSystemSettings } from '@/stores/system-settings-store';
import { DocumentFieldLabelsSettingsPanel } from '@/features/document-field-labels/components/DocumentFieldLabelsSettingsPanel';
import type { UpdateDocumentFieldLabelDto } from '@/features/document-field-labels/types/documentFieldLabels';

const DEFAULT_FORM_VALUES: SystemSettingsFormSchema = {
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
  hideDemandVatRate: false,
  hideQuotationVatRate: false,
  hideOrderVatRate: false,
  readonlyDemandVatRate: false,
  readonlyQuotationVatRate: false,
  readonlyOrderVatRate: false,
  catalogGroupCodeLabel: '',
  catalogCode1Label: '',
  catalogCode2Label: '',
  catalogCode3Label: '',
  catalogCode4Label: '',
  catalogCode5Label: '',
  customerCodeRuleEnabled: false,
  customerCodeMask: '',
  customerCodeExample: '',
  customerCodeErrorMessage: '',
  demandApprovalCompletionAction: 1,
  quotationApprovalCompletionAction: 1,
  orderApprovalCompletionAction: 1,
};

function getActionSelectLabel(
  value: number | string | undefined,
  options: Array<{ value: string; label: string }>,
  placeholder: string
): string {
  const selectedValue = value === undefined || value === null ? '' : String(value);
  return options.find((option) => option.value === selectedValue)?.label ?? placeholder;
}

function getSupportedActionValue(
  value: number | string | undefined,
  fallbackValue: number,
  options: Array<{ value: string; label: string }>
): number {
  const optionValues = new Set(options.map((option) => option.value));
  const valueAsString = value === undefined || value === null ? '' : String(value);

  if (optionValues.has(valueAsString)) {
    return Number(valueAsString);
  }

  const fallbackAsString = String(fallbackValue);
  if (optionValues.has(fallbackAsString)) {
    return fallbackValue;
  }

  return Number(options[0]?.value ?? 1);
}

interface ApprovalActionValues {
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
}

interface SystemSettingsFormProps {
  data: SystemSettingsDto | undefined;
  isLoading: boolean;
  isSubmitting: boolean;
  erpConnectionTest?: ApiResponse<ErpConnectionTestResultDto>;
  isTestingErpConnection: boolean;
  erpConnectionError?: string;
  onTestErpConnection: () => void | Promise<unknown>;
  onSubmit: (data: UpdateSystemSettingsDto) => void | Promise<void>;
}

export function SystemSettingsForm({
  data,
  isLoading,
  isSubmitting,
  erpConnectionTest,
  isTestingErpConnection,
  erpConnectionError,
  onTestErpConnection,
  onSubmit,
}: SystemSettingsFormProps): ReactElement {
  const { t } = useTranslation();

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
      label: t(`systemSettings.DemandActionLabels.${value}`),
    })),
    [t]
  );

  const quotationActionOptions = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((value) => ({
      value: String(value),
      label: t(`systemSettings.QuotationActionLabels.${value}`),
    })),
    [t]
  );

  const orderActionOptions = useMemo(
    () => [1, 2, 3, 4].map((value) => ({
      value: String(value),
      label: t(`systemSettings.OrderActionLabels.${value}`),
    })),
    [t]
  );

  const formValues = useMemo<SystemSettingsFormSchema>(() => {
    if (!data) return DEFAULT_FORM_VALUES;
    const normalizedData = normalizeSystemSettings(data);

    return {
      numberFormat: normalizedData.numberFormat,
      decimalPlaces: normalizedData.decimalPlaces,
      restrictCustomersBySalesRepMatch: normalizedData.restrictCustomersBySalesRepMatch,
      hideDemandVatRate: normalizedData.hideDemandVatRate,
      hideQuotationVatRate: normalizedData.hideQuotationVatRate,
      hideOrderVatRate: normalizedData.hideOrderVatRate,
      readonlyDemandVatRate: normalizedData.readonlyDemandVatRate,
      readonlyQuotationVatRate: normalizedData.readonlyQuotationVatRate,
      readonlyOrderVatRate: normalizedData.readonlyOrderVatRate,
      catalogGroupCodeLabel: normalizedData.catalogGroupCodeLabel ?? '',
      catalogCode1Label: normalizedData.catalogCode1Label ?? '',
      catalogCode2Label: normalizedData.catalogCode2Label ?? '',
      catalogCode3Label: normalizedData.catalogCode3Label ?? '',
      catalogCode4Label: normalizedData.catalogCode4Label ?? '',
      catalogCode5Label: normalizedData.catalogCode5Label ?? '',
      customerCodeRuleEnabled: normalizedData.customerCodeRuleEnabled,
      customerCodeMask: normalizedData.customerCodeMask ?? '',
      customerCodeExample: normalizedData.customerCodeExample ?? '',
      customerCodeErrorMessage: normalizedData.customerCodeErrorMessage ?? '',
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
  });

  const [approvalActionValues, setApprovalActionValues] = useState<ApprovalActionValues>({
    demandApprovalCompletionAction: DEFAULT_FORM_VALUES.demandApprovalCompletionAction,
    quotationApprovalCompletionAction: DEFAULT_FORM_VALUES.quotationApprovalCompletionAction,
    orderApprovalCompletionAction: DEFAULT_FORM_VALUES.orderApprovalCompletionAction,
  });
  const [documentFieldLabelItems, setDocumentFieldLabelItems] = useState<UpdateDocumentFieldLabelDto[]>([]);
  const isSaving = isSubmitting;

  const handleDocumentFieldLabelsChange = useCallback((items: UpdateDocumentFieldLabelDto[]) => {
    setDocumentFieldLabelItems(items);
  }, []);

  useEffect(() => {
    if (!data) return;
    form.reset(formValues);
    setApprovalActionValues({
      demandApprovalCompletionAction: formValues.demandApprovalCompletionAction,
      quotationApprovalCompletionAction: formValues.quotationApprovalCompletionAction,
      orderApprovalCompletionAction: formValues.orderApprovalCompletionAction,
    });
  }, [data, form, formValues]);

  const handleSubmit: SubmitHandler<SystemSettingsFormSchema> = async (values) => {
    await onSubmit({
      ...values,
      demandApprovalCompletionAction: getSupportedActionValue(
        approvalActionValues.demandApprovalCompletionAction,
        formValues.demandApprovalCompletionAction,
        demandActionOptions
      ),
      quotationApprovalCompletionAction: getSupportedActionValue(
        approvalActionValues.quotationApprovalCompletionAction,
        formValues.quotationApprovalCompletionAction,
        quotationActionOptions
      ),
      orderApprovalCompletionAction: getSupportedActionValue(
        approvalActionValues.orderApprovalCompletionAction,
        formValues.orderApprovalCompletionAction,
        orderActionOptions
      ),
      documentFieldLabels: documentFieldLabelItems.length > 0
        ? { items: documentFieldLabelItems }
        : undefined,
    });
  };
  const erpConnectionSucceeded = erpConnectionTest?.success === true;
  const erpConnectionMessage = erpConnectionSucceeded
    ? erpConnectionTest.message || t('systemSettings.ErpConnection.TestSucceeded')
    : erpConnectionError;
  const erpTokenSource = erpConnectionTest?.data?.source;
  const erpBranchCode = erpConnectionTest?.data?.branchCode;

  if (isLoading || !data) {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
        <Card className={headerCardStyle}>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                    <PlugZap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">{t('systemSettings.ErpConnection.Title')}</p>
                    <p className="text-muted-foreground text-sm">{t('systemSettings.ErpConnection.Description')}</p>
                    {erpConnectionMessage ? (
                      <div className="mt-2 flex items-start gap-2 text-sm">
                        {erpConnectionSucceeded ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        )}
                        <div className={erpConnectionSucceeded ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                          <p>{erpConnectionMessage}</p>
                          {erpConnectionSucceeded && (erpBranchCode || erpTokenSource) ? (
                            <p className="text-muted-foreground mt-1">
                              {[
                                erpBranchCode ? `${t('systemSettings.ErpConnection.BranchCode')}: ${erpBranchCode}` : null,
                                erpTokenSource ? `${t('systemSettings.ErpConnection.Source')}: ${erpTokenSource}` : null,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isTestingErpConnection}
                  onClick={() => void onTestErpConnection()}
                  className="shrink-0 rounded-xl"
                >
                  {isTestingErpConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('systemSettings.ErpConnection.Testing')}
                    </>
                  ) : (
                    <>
                      <PlugZap className="mr-2 h-4 w-4" />
                      {t('systemSettings.ErpConnection.TestButton')}
                    </>
                  )}
                </Button>
              </div>
            </div>

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
                  <p className="text-muted-foreground text-xs">
                    {t('systemSettings.Descriptions.DecimalPlacesRange', 'Ondalık basamak sayısı 0 ile 6 arasında olmalıdır.')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold">{t('systemSettings.Sections.VatVisibility', 'KDV oranı görünürlüğü')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('systemSettings.Descriptions.VatVisibility', 'Açıldığında ilgili talep, teklif veya sipariş satırlarında KDV oranı giriş alanı gizlenir. Hesaplama verisi korunur.')}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  ['hideDemandVatRate', t('systemSettings.Fields.HideDemandVatRate', 'Talepte KDV oranını gizle')],
                  ['hideQuotationVatRate', t('systemSettings.Fields.HideQuotationVatRate', 'Teklifte KDV oranını gizle')],
                  ['hideOrderVatRate', t('systemSettings.Fields.HideOrderVatRate', 'Siparişte KDV oranını gizle')],
                ] as const).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0C0516]">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <FormLabel required={false} className="leading-5">
                            {label}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold">{t('systemSettings.Sections.VatReadonly', 'KDV oranı düzenleme yetkisi')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('systemSettings.Descriptions.VatReadonly', 'Açıldığında ilgili talep, teklif veya sipariş satırlarında KDV oranı görünür kalır ancak kullanıcı tarafından değiştirilemez.')}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  ['readonlyDemandVatRate', t('systemSettings.Fields.ReadonlyDemandVatRate', 'Talepte KDV oranını kilitle')],
                  ['readonlyQuotationVatRate', t('systemSettings.Fields.ReadonlyQuotationVatRate', 'Teklifte KDV oranını kilitle')],
                  ['readonlyOrderVatRate', t('systemSettings.Fields.ReadonlyOrderVatRate', 'Siparişte KDV oranını kilitle')],
                ] as const).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0C0516]">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <FormLabel required={false} className="leading-5">
                            {label}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold">{t('systemSettings.Sections.CatalogLabels', 'Katalog kod alanı isimleri')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('systemSettings.Descriptions.CatalogLabels', 'Boş bırakılırsa Grup Kodu, Kod1, Kod2 gibi mevcut Netsis alan adları kullanılır. En fazla 50 karakter girilebilir.')}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  ['catalogGroupCodeLabel', t('systemSettings.Fields.CatalogGroupCodeLabel', 'Grup Kodu adı'), t('systemSettings.Placeholders.CatalogGroupCodeLabel', 'Örn. Marka')],
                  ['catalogCode1Label', t('systemSettings.Fields.CatalogCode1Label', 'Kod1 adı'), t('systemSettings.Placeholders.CatalogCode1Label', 'Örn. Seri')],
                  ['catalogCode2Label', t('systemSettings.Fields.CatalogCode2Label', 'Kod2 adı'), t('systemSettings.Placeholders.CatalogCode2Label', 'Örn. Model')],
                  ['catalogCode3Label', t('systemSettings.Fields.CatalogCode3Label', 'Kod3 adı'), t('systemSettings.Placeholders.CatalogCode3Label', 'Örn. Ölçü')],
                  ['catalogCode4Label', t('systemSettings.Fields.CatalogCode4Label', 'Kod4 adı'), t('systemSettings.Placeholders.CatalogCode4Label', 'Örn. Renk')],
                  ['catalogCode5Label', t('systemSettings.Fields.CatalogCode5Label', 'Kod5 adı'), t('systemSettings.Placeholders.CatalogCode5Label', 'Örn. Sınıf')],
                ] as const).map(([name, label, placeholder]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required={false}>{label}</FormLabel>
                        <FormControl>
                          <Input
                            className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0C0516]"
                            maxLength={50}
                            value={field.value ?? ''}
                            placeholder={placeholder}
                            onChange={(event) => field.onChange(event.target.value)}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <DocumentFieldLabelsSettingsPanel onItemsChange={handleDocumentFieldLabelsChange} />

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

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold">
                  {t('systemSettings.Sections.CustomerCodeRule', 'Kod format kuralları')}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t('systemSettings.Descriptions.CustomerCodeRule', 'Cari/ERP cari kodu için format kuralı burada yönetilir. Aynı maske yapısı ileride stok kodu gibi yeni kod türlerine de genişletilebilir. 9=rakam, A=harf, X=harf/rakam.')}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t('systemSettings.Sections.CustomerCodeRuleCustomerScope', 'Cari kodu')}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="customerCodeRuleEnabled"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0C0516]">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel required={false} className="leading-5">
                            {t('systemSettings.Fields.CustomerCodeRuleEnabled', 'Cari kodu format kuralını aktif et')}
                          </FormLabel>
                          <p className="text-muted-foreground text-xs">
                            {t('systemSettings.Descriptions.CustomerCodeRuleEnabled', 'Kapalıyken mevcut davranış korunur; açıkken müşteri kodu ve ERP cari kodu maskeye uymalıdır.')}
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {([
                  ['customerCodeMask', t('systemSettings.Fields.CustomerCodeMask', 'Cari kodu maskesi'), t('systemSettings.Placeholders.CustomerCodeMask', 'Örn. 999-9999-AAA'), 50],
                  ['customerCodeExample', t('systemSettings.Fields.CustomerCodeExample', 'Örnek cari kodu'), t('systemSettings.Placeholders.CustomerCodeExample', 'Örn. 123-4567-ABC'), 50],
                  ['customerCodeErrorMessage', t('systemSettings.Fields.CustomerCodeErrorMessage', 'Hata mesajı'), t('systemSettings.Placeholders.CustomerCodeErrorMessage', 'Örn. Cari kodu 123-4567-ABC formatında olmalıdır.'), 250],
                ] as const).map(([name, label, placeholder, maxLength]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className={name === 'customerCodeErrorMessage' ? 'md:col-span-2' : undefined}>
                        <FormLabel required={false}>{label}</FormLabel>
                        <FormControl>
                          <Input
                            className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0C0516]"
                            maxLength={maxLength}
                            value={field.value ?? ''}
                            placeholder={placeholder}
                            onChange={(event) => field.onChange(event.target.value)}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="demandApprovalCompletionAction"
              render={() => {
                const selectedValue = String(getSupportedActionValue(
                  approvalActionValues.demandApprovalCompletionAction,
                  formValues.demandApprovalCompletionAction,
                  demandActionOptions
                ));
                const selectedLabel = getActionSelectLabel(
                  selectedValue,
                  demandActionOptions,
                  t('systemSettings.Placeholders.ApprovalCompletionAction')
                );

                return (
                  <FormItem>
                    <FormLabel>{t('systemSettings.Fields.DemandApprovalCompletionAction')}</FormLabel>
                    <Select
                      value={selectedValue}
                      onValueChange={(value) => {
                        const nextValue = Number(value);
                        setApprovalActionValues((current) => ({
                          ...current,
                          demandApprovalCompletionAction: nextValue,
                        }));
                        form.setValue('demandApprovalCompletionAction', nextValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <span data-slot="select-value" className="min-w-0 truncate">
                            {selectedLabel}
                          </span>
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
                );
              }}
            />

            <FormField
              control={form.control}
              name="quotationApprovalCompletionAction"
              render={() => {
                const selectedValue = String(getSupportedActionValue(
                  approvalActionValues.quotationApprovalCompletionAction,
                  formValues.quotationApprovalCompletionAction,
                  quotationActionOptions
                ));
                const selectedLabel = getActionSelectLabel(
                  selectedValue,
                  quotationActionOptions,
                  t('systemSettings.Placeholders.ApprovalCompletionAction')
                );

                return (
                  <FormItem>
                    <FormLabel>{t('systemSettings.Fields.QuotationApprovalCompletionAction')}</FormLabel>
                    <Select
                      value={selectedValue}
                      onValueChange={(value) => {
                        const nextValue = Number(value);
                        setApprovalActionValues((current) => ({
                          ...current,
                          quotationApprovalCompletionAction: nextValue,
                        }));
                        form.setValue('quotationApprovalCompletionAction', nextValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <span data-slot="select-value" className="min-w-0 truncate">
                            {selectedLabel}
                          </span>
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
                );
              }}
            />

            <FormField
              control={form.control}
              name="orderApprovalCompletionAction"
              render={() => {
                const selectedValue = String(getSupportedActionValue(
                  approvalActionValues.orderApprovalCompletionAction,
                  formValues.orderApprovalCompletionAction,
                  orderActionOptions
                ));
                const selectedLabel = getActionSelectLabel(
                  selectedValue,
                  orderActionOptions,
                  t('systemSettings.Placeholders.ApprovalCompletionAction')
                );

                return (
                  <FormItem>
                    <FormLabel>{t('systemSettings.Fields.OrderApprovalCompletionAction')}</FormLabel>
                    <Select
                      value={selectedValue}
                      onValueChange={(value) => {
                        const nextValue = Number(value);
                        setApprovalActionValues((current) => ({
                          ...current,
                          orderApprovalCompletionAction: nextValue,
                        }));
                        form.setValue('orderApprovalCompletionAction', nextValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <span data-slot="select-value" className="min-w-0 truncate">
                            {selectedLabel}
                          </span>
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
                );
              }}
            />

            <div className="md:col-span-2 flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="min-w-[140px] bg-[image:var(--crm-brand-gradient)] px-8 font-bold text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] ring-1 ring-white/10 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] border-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : t('common.save')}
              </Button>
            </div>

          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
