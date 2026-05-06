import { Fragment, type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { usePaymentTypes } from '@/features/quotation/hooks/usePaymentTypes';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Send } from 'lucide-react';
import { useConvertWhatsappQuoteDraftMutation, useSendWhatsappQuoteDraftMutation } from '../hooks/useWhatsappIntegrationMutations';
import { useWhatsappQuoteDraftsQuery } from '../hooks/useWhatsappQuoteDraftsQuery';
import type { WhatsappQuoteDraftDto } from '../types/whatsapp-integration.types';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function formatMoney(value?: number | null): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function customerLabel(draft: WhatsappQuoteDraftDto): string {
  if (draft.customerName?.trim()) return draft.customerName;
  if (draft.contactName?.trim()) return draft.contactName;
  return '-';
}

function toDateInputValue(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function addDaysInputValue(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseOptionalNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function WhatsappQuoteDraftActionPanel({ draft }: { draft: WhatsappQuoteDraftDto }): ReactElement {
  const { t } = useTranslation('whatsapp-integration');
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const [representativeId, setRepresentativeId] = useState(currentUserId ? String(currentUserId) : '');
  const [customerId, setCustomerId] = useState(draft.customerId ? String(draft.customerId) : '');
  const [paymentTypeId, setPaymentTypeId] = useState('');
  const [documentSerialTypeId, setDocumentSerialTypeId] = useState('');
  const [currency, setCurrency] = useState('1');
  const [offerType, setOfferType] = useState('YURTICI');
  const [offerDate, setOfferDate] = useState(toDateInputValue());
  const [deliveryDate, setDeliveryDate] = useState(addDaysInputValue(21));
  const [description, setDescription] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [sendWhatsappMessage, setSendWhatsappMessage] = useState(true);
  const [attachPdf, setAttachPdf] = useState(true);

  const representativeIdNumber = parseOptionalNumber(representativeId);
  const selectedCustomerId = parseOptionalNumber(customerId);
  const { data: customerOptions = [] } = useCustomerOptions(representativeIdNumber);
  const { data: paymentTypes = [], isLoading: isPaymentTypesLoading } = usePaymentTypes();
  const { currencyOptions } = useCurrencyOptions(offerDate ? new Date(offerDate) : undefined);

  const selectedCustomer = useMemo(
    () => customerOptions.find((customer) => customer.id === selectedCustomerId),
    [customerOptions, selectedCustomerId]
  );

  const { data: documentSerialTypes = [], isLoading: isDocumentSerialTypesLoading } = useAvailableDocumentSerialTypes(
    selectedCustomer?.customerTypeId ?? 0,
    representativeIdNumber,
    PricingRuleType.Quotation
  );

  const currencyChoices = currencyOptions.length > 0
    ? currencyOptions
    : [{ value: 1, label: 'TRY', code: 'TRY' }];

  useEffect(() => {
    if (!paymentTypeId && paymentTypes.length > 0) {
      setPaymentTypeId(String(paymentTypes[0].id));
    }
  }, [paymentTypeId, paymentTypes]);

  useEffect(() => {
    if (!documentSerialTypeId && documentSerialTypes.length > 0) {
      setDocumentSerialTypeId(String(documentSerialTypes[0].id));
    }
  }, [documentSerialTypeId, documentSerialTypes]);

  const convertMutation = useConvertWhatsappQuoteDraftMutation();
  const sendMutation = useSendWhatsappQuoteDraftMutation();
  const isBusy = convertMutation.isPending || sendMutation.isPending;
  const canConvert = !!selectedCustomerId && !!representativeIdNumber && !!parseOptionalNumber(paymentTypeId) && !!parseOptionalNumber(documentSerialTypeId);
  const existingCustomerLabel = draft.customerName || draft.contactName || draft.phoneNumber;

  const handleConvert = (): void => {
    const paymentTypeIdNumber = parseOptionalNumber(paymentTypeId);
    const documentSerialTypeIdNumber = parseOptionalNumber(documentSerialTypeId);
    if (!selectedCustomerId || !representativeIdNumber || !paymentTypeIdNumber || !documentSerialTypeIdNumber) return;

    convertMutation.mutate({
      draftId: draft.id,
      payload: {
        potentialCustomerId: selectedCustomerId,
        erpCustomerCode: selectedCustomer?.customerCode ?? null,
        deliveryDate,
        representativeId: representativeIdNumber,
        paymentTypeId: paymentTypeIdNumber,
        documentSerialTypeId: documentSerialTypeIdNumber,
        offerType,
        offerDate,
        currency,
        description: description.trim() || null,
        sendWhatsappMessage,
        attachPdf,
        customerMessage: customerMessage.trim() || null,
      },
    });
  };

  const handleSend = (): void => {
    sendMutation.mutate({
      draftId: draft.id,
      payload: {
        attachPdf,
        customerMessage: customerMessage.trim() || null,
      },
    });
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{t('drafts.actions.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('drafts.actions.description')}</p>
        </div>
        {draft.quotationId ? (
          <Badge variant="default">{t('drafts.actions.createdQuotation', { id: draft.quotationId })}</Badge>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.representativeId')}</span>
          <Input value={representativeId} onChange={(event) => setRepresentativeId(event.target.value)} inputMode="numeric" />
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.customer')}</span>
          <Select value={customerId || '__none'} onValueChange={(value) => setCustomerId(value === '__none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder={existingCustomerLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('drafts.actions.selectCustomer')}</SelectItem>
              {customerOptions.map((customer) => (
                <SelectItem key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.paymentType')}</span>
          <Select value={paymentTypeId || '__none'} onValueChange={(value) => setPaymentTypeId(value === '__none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder={isPaymentTypesLoading ? t('drafts.actions.loading') : t('drafts.actions.selectPaymentType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('drafts.actions.selectPaymentType')}</SelectItem>
              {paymentTypes.map((paymentType) => (
                <SelectItem key={paymentType.id} value={String(paymentType.id)}>
                  {paymentType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.documentSerial')}</span>
          <Select value={documentSerialTypeId || '__none'} onValueChange={(value) => setDocumentSerialTypeId(value === '__none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder={isDocumentSerialTypesLoading ? t('drafts.actions.loading') : t('drafts.actions.selectDocumentSerial')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('drafts.actions.selectDocumentSerial')}</SelectItem>
              {documentSerialTypes.map((serialType) => (
                <SelectItem key={serialType.id} value={String(serialType.id)}>
                  {serialType.serialPrefix || `#${serialType.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.offerType')}</span>
          <Select value={offerType} onValueChange={setOfferType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YURTICI">{t('drafts.actions.domestic')}</SelectItem>
              <SelectItem value="YURTDISI">{t('drafts.actions.foreign')}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.currency')}</span>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyChoices.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.offerDate')}</span>
          <Input type="date" value={offerDate} onChange={(event) => setOfferDate(event.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.deliveryDate')}</span>
          <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.descriptionField')}</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>{t('drafts.actions.customerMessageField')}</span>
          <Textarea value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} rows={3} />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <Switch checked={sendWhatsappMessage} onCheckedChange={setSendWhatsappMessage} disabled={!!draft.quotationId} />
            {t('drafts.actions.sendAfterConvert')}
          </label>
          <label className="flex items-center gap-2 font-medium">
            <Switch checked={attachPdf} onCheckedChange={setAttachPdf} />
            {t('drafts.actions.attachPdf')}
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {draft.quotationId ? (
            <Button onClick={handleSend} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t('drafts.actions.sendAgain')}
            </Button>
          ) : (
            <Button onClick={handleConvert} disabled={!canConvert || isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t('drafts.actions.convertAndSend')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsappQuoteDraftsPage(): ReactElement {
  const { t } = useTranslation(['whatsapp-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null);

  const query = useWhatsappQuoteDraftsQuery({
    pageNumber,
    pageSize: 20,
    search,
    sortBy: 'createdDate',
    sortDirection: 'desc',
  });

  useEffect(() => {
    setPageTitle(t('drafts.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const drafts = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const hasNext = query.data?.hasNextPage === true;
  const hasPrevious = query.data?.hasPreviousPage === true;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('drafts.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('drafts.description')}</p>
      </div>

      <Card className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
        <CardHeader>
          <CardTitle>{t('drafts.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageNumber(1);
              }}
              placeholder={t('drafts.searchPlaceholder')}
              className="w-full sm:w-80"
            />
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('common:refresh')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t('drafts.columns.createdDate')}</TableHead>
                  <TableHead>{t('drafts.columns.phone')}</TableHead>
                  <TableHead>{t('drafts.columns.customer')}</TableHead>
                  <TableHead>{t('drafts.columns.status')}</TableHead>
                  <TableHead className="text-right">{t('drafts.columns.lineCount')}</TableHead>
                  <TableHead className="text-right">{t('drafts.columns.grandTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : drafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('drafts.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  drafts.map((draft) => {
                    const isExpanded = expandedDraftId === draft.id;
                    return (
                      <Fragment key={draft.id}>
                        <TableRow key={draft.id} className="cursor-pointer" onClick={() => setExpandedDraftId(isExpanded ? null : draft.id)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(draft.createdDate)}</TableCell>
                          <TableCell>{draft.phoneNumber}</TableCell>
                          <TableCell>{customerLabel(draft)}</TableCell>
                          <TableCell>
                            <Badge variant={draft.status === 'WaitingRepresentativeReview' ? 'secondary' : 'default'}>
                              {t(`drafts.status.${draft.status}`, { defaultValue: draft.status })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{draft.lines.length}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(draft.grandTotal)}</TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow key={`${draft.id}-details`}>
                            <TableCell colSpan={7} className="bg-slate-50/80 p-0">
                              <div className="space-y-3 p-4">
                                {draft.customerMessage ? (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{t('drafts.customerMessage')}:</span> {draft.customerMessage}
                                  </p>
                                ) : null}
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t('drafts.lineColumns.code')}</TableHead>
                                        <TableHead>{t('drafts.lineColumns.name')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.quantity')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.unitPrice')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.total')}</TableHead>
                                        <TableHead>{t('drafts.lineColumns.type')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {draft.lines.map((line) => (
                                        <TableRow key={line.id}>
                                          <TableCell className="font-mono text-xs">{line.productCode}</TableCell>
                                          <TableCell>{line.productName}</TableCell>
                                          <TableCell className="text-right">{line.quantity}</TableCell>
                                          <TableCell className="text-right">{formatMoney(line.unitPrice)}</TableCell>
                                          <TableCell className="text-right">{formatMoney(line.lineGrandTotal)}</TableCell>
                                          <TableCell>
                                            <Badge variant={line.isMandatoryRelatedProduct ? 'outline' : 'default'}>
                                              {line.isMandatoryRelatedProduct ? t('drafts.relatedLine') : t('drafts.mainLine')}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                <WhatsappQuoteDraftActionPanel draft={draft} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('drafts.total', { count: totalCount })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>
                {t('common:previous')}
              </Button>
              <span>{pageNumber}</span>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPageNumber((value) => value + 1)}>
                {t('common:next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
