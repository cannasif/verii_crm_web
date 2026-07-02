import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, HelpCircle, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useIntegratedSupplierSearch, type IntegratedSupplierOption } from '@/features/purchase/hooks/useIntegratedSupplierSearch';
import type { ApiResponse } from '@/types/api';

type PurchaseCreateKind = 'request' | 'supplierQuotation' | 'order';

interface PurchaseSimpleCreatePageProps {
  kind: PurchaseCreateKind;
}

interface PurchaseLineForm {
  clientKey: string;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
  discount1: string;
  discount2: string;
  discount3: string;
  deliveryDate: string;
  description1: string;
  description2: string;
  description3: string;
  profilDefinitionId: string;
  demirDefinitionId: string;
  vidaDefinitionId: string;
  baskiDefinitionId: string;
  baskiAciklama: string;
  erpProjectCode: string;
}

interface CreatedPurchaseDocument {
  id: number;
}

const createClientKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptyLine = (): PurchaseLineForm => ({
  clientKey: createClientKey(),
  productCode: '',
  productName: '',
  quantity: '1',
  unit: '',
  unitPrice: '0',
  vatRate: '20',
  discount1: '0',
  discount2: '0',
  discount3: '0',
  deliveryDate: '',
  description1: '',
  description2: '',
  description3: '',
  profilDefinitionId: '',
  demirDefinitionId: '',
  vidaDefinitionId: '',
  baskiDefinitionId: '',
  baskiAciklama: '',
  erpProjectCode: '',
});

const NOTE_COUNT = 15;

interface ExchangeRateForm {
  clientKey: string;
  currency: string;
  exchangeRate: string;
  exchangeRateDate: string;
  isOfficial: boolean;
}

const createEmptyExchangeRate = (): ExchangeRateForm => ({
  clientKey: createClientKey(),
  currency: '',
  exchangeRate: '1',
  exchangeRateDate: '',
  isOfficial: true,
});

const configs = {
  request: {
    title: 'Yeni Satınalma Talebi',
    description: 'Tedarikçi seçmeden iç satınalma ihtiyacını oluşturun.',
    listPath: '/purchase/requests',
    endpoint: '/api/PurchaseRequest',
    numberField: 'requestNo',
    numberLabel: 'Talep No',
    dateField: 'requestDate',
    dateLabel: 'Talep Tarihi',
    successMessage: 'Satınalma talebi kaydedildi.',
  },
  supplierQuotation: {
    title: 'Yeni Tedarikçi Teklifi',
    description: 'Tedarikçiden gelen fiyat bilgisini satınalma teklif kaydı olarak girin.',
    listPath: '/purchase/supplier-quotations',
    endpoint: '/api/SupplierQuotation',
    numberField: 'quotationNo',
    numberLabel: 'Teklif No',
    dateField: 'quotationDate',
    dateLabel: 'Teklif Tarihi',
    successMessage: 'Tedarikçi teklifi kaydedildi.',
  },
  order: {
    title: 'Yeni Satınalma Siparişi',
    description: 'Seçilen tedarikçiye satınalma sipariş kaydı oluşturun.',
    listPath: '/purchase/orders',
    endpoint: '/api/PurchaseOrder',
    numberField: 'orderNo',
    numberLabel: 'Sipariş No',
    dateField: 'orderDate',
    dateLabel: 'Sipariş Tarihi',
    successMessage: 'Satınalma siparişi kaydedildi.',
  },
} as const;

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--crm-border)] text-[var(--crm-text-muted)] transition hover:border-[var(--crm-brand-primary)] hover:text-[var(--crm-brand-primary)]"
          aria-label="Bilgi"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm leading-5">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function PurchaseSupplierCombobox({
  value,
  selectedSupplier,
  onSelect,
}: {
  value: string;
  selectedSupplier: IntegratedSupplierOption | null;
  onSelect: (supplier: IntegratedSupplierOption | null) => void;
}) {
  const [supplierSearch, setSupplierSearch] = useState('');
  const supplierQuery = useIntegratedSupplierSearch(supplierSearch);

  return (
    <VoiceSearchCombobox
      value={value || null}
      options={supplierQuery.options}
      onSelect={(selectedValue) => {
        if (!selectedValue) {
          onSelect(null);
          return;
        }

        const supplier = supplierQuery.suppliers.find((item) => item.id.toString() === selectedValue);
        if (supplier) {
          onSelect(supplier);
        }
      }}
      onDebouncedSearchChange={setSupplierSearch}
      onFetchNextPage={() => {
        void supplierQuery.fetchNextPage();
      }}
      hasNextPage={supplierQuery.hasNextPage}
      isLoading={supplierQuery.isLoading || supplierQuery.isFetching}
      isFetchingNextPage={supplierQuery.isFetchingNextPage}
      minChars={supplierQuery.minChars}
      placeholder={selectedSupplier ? `${selectedSupplier.customerCode} - ${selectedSupplier.name}` : 'ERP entegre tedarikçi seçin'}
      searchPlaceholder="Cari kodu veya tedarikçi adı ile ara..."
      className="h-12 rounded-[8px] border-[var(--crm-border)] bg-[var(--crm-input-bg)] font-semibold text-[var(--crm-text-primary)]"
      popoverContentClassName="rounded-[8px]"
      disableToggleOff
    />
  );
}

export function PurchaseSimpleCreatePage({ kind }: PurchaseSimpleCreatePageProps) {
  const navigate = useNavigate();
  const config = configs[kind];
  const isRequest = kind === 'request';
  const [documentNo, setDocumentNo] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<IntegratedSupplierOption | null>(null);
  const [currencyCode, setCurrencyCode] = useState('TL');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [paymentTypeId, setPaymentTypeId] = useState('');
  const [documentSerialTypeId, setDocumentSerialTypeId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [department, setDepartment] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [erpProjectCode, setErpProjectCode] = useState('');
  const [ozelKod1, setOzelKod1] = useState('');
  const [ozelKod2, setOzelKod2] = useState('');
  const [generalDiscountRate, setGeneralDiscountRate] = useState('0');
  const [generalDiscountAmount, setGeneralDiscountAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState<string[]>(() => Array.from({ length: NOTE_COUNT }, () => ''));
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateForm[]>([createEmptyExchangeRate()]);
  const [lines, setLines] = useState<PurchaseLineForm[]>([createEmptyLine()]);

  const visibleLines = useMemo(() => lines.filter((line) => line.productName.trim()), [lines]);
  const totals = useMemo(() => {
    const gross = visibleLines.reduce((sum, line) => {
      const unitPrice = toNumber(line.unitPrice);
      const quantity = toNumber(line.quantity, 1);
      const d1 = Math.min(100, Math.max(0, toNumber(line.discount1)));
      const d2 = Math.min(100, Math.max(0, toNumber(line.discount2)));
      const d3 = Math.min(100, Math.max(0, toNumber(line.discount3)));
      const vat = Math.min(100, Math.max(0, toNumber(line.vatRate, 20)));
      const net = unitPrice * (100 - d1) / 100 * (100 - d2) / 100 * (100 - d3) / 100;
      const subtotal = quantity * net;
      return sum + subtotal + subtotal * vat / 100;
    }, 0);
    const discountByRate = gross * Math.min(100, Math.max(0, toNumber(generalDiscountRate))) / 100;
    return Math.max(0, gross - discountByRate - Math.max(0, toNumber(generalDiscountAmount)));
  }, [generalDiscountAmount, generalDiscountRate, visibleLines]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const response = await api.post<ApiResponse<CreatedPurchaseDocument>>(config.endpoint, payload);
      if (!response.success || !response.data?.id) {
        throw new Error(response.message || 'Satınalma kaydı oluşturulamadı.');
      }
      return response.data.id;
    },
    onSuccess: (id) => {
      toast.success(config.successMessage);
      navigate(`${config.listPath}?created=${id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Satınalma kaydı oluşturulamadı.');
    },
  });

  const buildPayload = () => {
    if (!visibleLines.length) {
      throw new Error('En az bir satır girilmelidir.');
    }
    if (!isRequest && !selectedSupplier) {
      throw new Error('Tedarikçi seçimi zorunludur. Yalnızca ERP’ye entegre, cari kodu dolu müşteriler seçilebilir.');
    }

    const mappedLines = visibleLines.map((line) => {
      const baseLine = {
        productCode: line.productCode.trim() || null,
        productName: line.productName.trim(),
        quantity: toNumber(line.quantity, 1),
        unit: line.unit.trim() || null,
        deliveryDate: line.deliveryDate || null,
        description1: line.description1.trim() || null,
        description2: line.description2.trim() || null,
        description3: line.description3.trim() || null,
        erpProjectCode: line.erpProjectCode.trim() || null,
      };

      if (isRequest) {
        return baseLine;
      }

      return {
        ...baseLine,
        unitPrice: toNumber(line.unitPrice),
        discount1: toNumber(line.discount1),
        discount2: toNumber(line.discount2),
        discount3: toNumber(line.discount3),
        vatRate: toNumber(line.vatRate, 20),
        profilDefinitionId: line.profilDefinitionId ? Number(line.profilDefinitionId) : null,
        demirDefinitionId: line.demirDefinitionId ? Number(line.demirDefinitionId) : null,
        vidaDefinitionId: line.vidaDefinitionId ? Number(line.vidaDefinitionId) : null,
        baskiDefinitionId: line.baskiDefinitionId ? Number(line.baskiDefinitionId) : null,
        baskiAciklama: line.baskiAciklama.trim() || null,
      };
    });

    const mappedNotes = notes.reduce<Record<string, string | null>>((acc, note, index) => {
      acc[`note${index + 1}`] = note.trim() || null;
      return acc;
    }, {});

    return {
      [config.numberField]: documentNo.trim() || null,
      [config.dateField]: documentDate || null,
      supplierId: isRequest ? undefined : selectedSupplier?.id,
      supplierNameSnapshot: isRequest ? undefined : selectedSupplier?.name ?? null,
      supplierErpCode: isRequest ? undefined : selectedSupplier?.customerCode ?? null,
      paymentTypeId: isRequest || !paymentTypeId ? undefined : Number(paymentTypeId),
      documentSerialTypeId: isRequest || !documentSerialTypeId ? undefined : Number(documentSerialTypeId),
      purchaseType: isRequest ? undefined : purchaseType.trim() || null,
      currencyCode: isRequest ? undefined : currencyCode.trim() || 'TL',
      exchangeRate: isRequest ? undefined : toNumber(exchangeRate, 1),
      generalDiscountRate: isRequest ? undefined : toNumber(generalDiscountRate),
      generalDiscountAmount: isRequest ? undefined : toNumber(generalDiscountAmount),
      department: department.trim() || null,
      projectCode: projectCode.trim() || null,
      erpProjectCode: isRequest ? undefined : erpProjectCode.trim() || null,
      ozelKod1: isRequest ? undefined : ozelKod1.trim() || null,
      ozelKod2: isRequest ? undefined : ozelKod2.trim() || null,
      description: description.trim() || null,
      notes: isRequest ? undefined : mappedNotes,
      exchangeRates: isRequest
        ? undefined
        : exchangeRates
          .filter((rate) => rate.currency.trim())
          .map((rate) => ({
            currency: rate.currency.trim(),
            exchangeRate: toNumber(rate.exchangeRate, 1),
            exchangeRateDate: rate.exchangeRateDate || new Date().toISOString(),
            isOfficial: rate.isOfficial,
          })),
      lines: mappedLines,
    };
  };

  const updateLine = (index: number, patch: Partial<PurchaseLineForm>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const updateExchangeRate = (index: number, patch: Partial<ExchangeRateForm>) => {
    setExchangeRates((current) => current.map((rate, rateIndex) => (rateIndex === index ? { ...rate, ...patch } : rate)));
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-4 py-6 text-[var(--crm-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-[8px]">
              <Link to={config.listPath}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{config.title}</h1>
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                {config.description}
              </p>
            </div>
          </div>
          <Button type="button" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </header>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-[var(--crm-brand-primary)]" />
            Başlık Bilgileri
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                {config.numberLabel}
                <FieldHelp text="Boş bırakılırsa belge sistem/operasyon numaralandırmasına uygun şekilde sonradan takip edilebilir." />
              </span>
              <Input value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} placeholder="Boş bırakılabilir" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--crm-text-muted)]">{config.dateLabel}</span>
              <Input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Proje Kodu</span>
              <Input value={projectCode} onChange={(event) => setProjectCode(event.target.value)} placeholder="Opsiyonel" />
            </label>
            {!isRequest ? (
              <>
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                    Tedarikçi
                    <FieldHelp text="Satınalma teklifi ve siparişi mevcut müşteri/cari kartından seçilen ERP entegre tedarikçi ile açılır. Cari kodu olmayan kayıt tedarikçi olarak kullanılamaz." />
                  </span>
                  <PurchaseSupplierCombobox
                    value={supplierId}
                    selectedSupplier={selectedSupplier}
                    onSelect={(supplier) => {
                      setSelectedSupplier(supplier);
                      setSupplierId(supplier?.id.toString() ?? '');
                    }}
                  />
                </label>
                {selectedSupplier ? (
                  <div className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-muted-bg,rgba(148,163,184,0.08))] p-3 text-sm text-[var(--crm-text-muted)]">
                    <div className="font-semibold text-[var(--crm-text-primary)]">{selectedSupplier.name}</div>
                    <div>ERP Cari Kodu: {selectedSupplier.customerCode}</div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Para Birimi</span>
                    <Input value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Kur</span>
                    <Input value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} inputMode="decimal" />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Ödeme Tipi ID</span>
                  <Input value={paymentTypeId} onChange={(event) => setPaymentTypeId(event.target.value)} inputMode="numeric" placeholder="Opsiyonel" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Belge Seri ID</span>
                  <Input value={documentSerialTypeId} onChange={(event) => setDocumentSerialTypeId(event.target.value)} inputMode="numeric" placeholder="Opsiyonel" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Satınalma Tipi</span>
                  <Input value={purchaseType} onChange={(event) => setPurchaseType(event.target.value)} placeholder="Yurtiçi / Yurtdışı / RFQ" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">ERP Proje Kodu</span>
                  <Input value={erpProjectCode} onChange={(event) => setErpProjectCode(event.target.value)} placeholder="Opsiyonel" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Özel Kod 1</span>
                  <Input value={ozelKod1} onChange={(event) => setOzelKod1(event.target.value)} maxLength={10} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Özel Kod 2</span>
                  <Input value={ozelKod2} onChange={(event) => setOzelKod2(event.target.value)} maxLength={10} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Genel İskonto %</span>
                  <Input value={generalDiscountRate} onChange={(event) => setGeneralDiscountRate(event.target.value)} inputMode="decimal" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Genel İskonto Tutarı</span>
                  <Input value={generalDiscountAmount} onChange={(event) => setGeneralDiscountAmount(event.target.value)} inputMode="decimal" />
                </label>
              </>
            ) : null}
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Departman</span>
              <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Opsiyonel" />
            </label>
            <label className="space-y-2 md:col-span-3">
              <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Açıklama</span>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </label>
          </div>
        </section>

        {!isRequest ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Döviz Kurları</h2>
                <Button type="button" variant="outline" onClick={() => setExchangeRates((current) => [...current, createEmptyExchangeRate()])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Kur Ekle
                </Button>
              </div>
              <div className="space-y-3">
                {exchangeRates.map((rate, index) => (
                  <div key={rate.clientKey} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_44px]">
                    <Input value={rate.currency} onChange={(event) => updateExchangeRate(index, { currency: event.target.value })} placeholder="DOLAR / EURO / TL" />
                    <Input value={rate.exchangeRate} onChange={(event) => updateExchangeRate(index, { exchangeRate: event.target.value })} inputMode="decimal" placeholder="Kur" />
                    <Input type="date" value={rate.exchangeRateDate} onChange={(event) => updateExchangeRate(index, { exchangeRateDate: event.target.value })} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setExchangeRates((current) => current.filter((_, rateIndex) => rateIndex !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Özet</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-[var(--crm-text-muted)]">
                  <span>Satır Sayısı</span>
                  <strong className="text-[var(--crm-text-primary)]">{visibleLines.length}</strong>
                </div>
                <div className="flex justify-between text-[var(--crm-text-muted)]">
                  <span>Genel Toplam</span>
                  <strong className="text-xl text-[var(--crm-brand-primary)]">{totals.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {currencyCode}</strong>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Satırlar</h2>
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              Satır Ekle
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.clientKey}
                className="rounded-[8px] border border-[var(--crm-border)] p-3"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_2fr_110px_110px_110px_90px_44px]">
                  <Input value={line.productCode} onChange={(event) => updateLine(index, { productCode: event.target.value })} placeholder="Stok kodu" />
                  <Input value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Ürün/hizmet adı" />
                  <Input value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} placeholder="Miktar" inputMode="decimal" />
                  <Input value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} placeholder="Birim" />
                  <Input
                    value={line.unitPrice}
                    onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                    placeholder="Fiyat"
                    inputMode="decimal"
                    disabled={isRequest}
                  />
                  <Input
                    value={line.vatRate}
                    onChange={(event) => updateLine(index, { vatRate: event.target.value })}
                    placeholder="KDV"
                    inputMode="decimal"
                    disabled={isRequest}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!isRequest ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Input value={line.discount1} onChange={(event) => updateLine(index, { discount1: event.target.value })} placeholder="İskonto 1 %" inputMode="decimal" />
                    <Input value={line.discount2} onChange={(event) => updateLine(index, { discount2: event.target.value })} placeholder="İskonto 2 %" inputMode="decimal" />
                    <Input value={line.discount3} onChange={(event) => updateLine(index, { discount3: event.target.value })} placeholder="İskonto 3 %" inputMode="decimal" />
                    <Input type="date" value={line.deliveryDate} onChange={(event) => updateLine(index, { deliveryDate: event.target.value })} />
                    <Input value={line.erpProjectCode} onChange={(event) => updateLine(index, { erpProjectCode: event.target.value })} placeholder="Satır ERP proje kodu" />
                    <Input value={line.baskiAciklama} onChange={(event) => updateLine(index, { baskiAciklama: event.target.value })} placeholder="Baskı açıklaması" />
                    <Input value={line.description1} onChange={(event) => updateLine(index, { description1: event.target.value })} placeholder="Açıklama 1" />
                    <Input value={line.description2} onChange={(event) => updateLine(index, { description2: event.target.value })} placeholder="Açıklama 2" />
                    <Input value={line.description3} onChange={(event) => updateLine(index, { description3: event.target.value })} placeholder="Açıklama 3" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {!isRequest ? (
          <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Belge Notları</h2>
              <FieldHelp text="Satış teklif/sipariş not mantığının satınalma karşılığıdır. Boş bırakılan notlar kayıtta boş geçilir." />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {notes.map((note, index) => (
                <label key={index} className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--crm-text-muted)]">Not {index + 1}</span>
                  <Input
                    value={note}
                    maxLength={100}
                    onChange={(event) => setNotes((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                    placeholder={`Belge notu ${index + 1}`}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function PurchaseRequestCreatePage() {
  return <PurchaseSimpleCreatePage kind="request" />;
}

export function SupplierQuotationCreatePage() {
  return <PurchaseSimpleCreatePage kind="supplierQuotation" />;
}

export function PurchaseOrderCreatePage() {
  return <PurchaseSimpleCreatePage kind="order" />;
}
