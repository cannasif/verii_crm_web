import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  Layers,
  Package,
  Percent,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import type { IntegratedSupplierOption } from '@/features/purchase/hooks/useIntegratedSupplierSearch';
import type { ApiResponse } from '@/types/api';
import { areDiscountRatesValid, getDiscountRateTotal } from '@/lib/discount-rate-validation';
import { calculateLineTotalsAmounts } from '@/lib/line-discount-display';
import {
  createEmptyExchangeRate,
  createEmptyLine,
  formatMoney,
  NOTE_COUNT,
  productToLineMarker,
  purchaseCreateConfigs,
  toNumber,
  type CreatedPurchaseDocument,
  type ExchangeRateForm,
  type PurchaseCreateKind,
  type PurchaseLineForm,
} from '../types/purchase-create-types';
import {
  FieldLabel,
  INPUT_CLASSNAME,
  PurchaseSupplierCombobox,
  SECTION_CARD_CLASSNAME,
  SectionTitle,
} from '../components/PurchaseCreateUi';

interface PurchaseSimpleCreatePageProps {
  kind: PurchaseCreateKind;
}

export function PurchaseSimpleCreatePage({ kind }: PurchaseSimpleCreatePageProps) {
  const navigate = useNavigate();
  const config = purchaseCreateConfigs[kind];
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
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [targetLineIndex, setTargetLineIndex] = useState<number | null>(null);

  const visibleLines = useMemo(
    () => lines.filter((line) => line.productName.trim() || line.productCode.trim()),
    [lines]
  );
  const existingLineStockMarkers = useMemo<ProductSelectionResult[]>(
    () =>
      lines
        .filter((line) => line.productCode.trim() || line.productName.trim())
        .map(productToLineMarker),
    [lines],
  );
  const totals = useMemo(() => {
    const lineSummaries = visibleLines.map((line) => {
      const unitPrice = toNumber(line.unitPrice);
      const quantity = toNumber(line.quantity, 1);
      const discountRate1 = Math.min(100, Math.max(0, toNumber(line.discount1)));
      const discountRate2 = Math.min(100, Math.max(0, toNumber(line.discount2)));
      const discountRate3 = Math.min(100, Math.max(0, toNumber(line.discount3)));
      const vatRate = Math.min(100, Math.max(0, toNumber(line.vatRate, 20)));
      return calculateLineTotalsAmounts(unitPrice, quantity, discountRate1, discountRate2, discountRate3, vatRate);
    });
    const netTotal = lineSummaries.reduce((sum, line) => sum + line.lineTotal, 0);
    const discountByRate = netTotal * Math.min(100, Math.max(0, toNumber(generalDiscountRate))) / 100;
    const generalDiscount = Math.min(netTotal, discountByRate + Math.max(0, toNumber(generalDiscountAmount)));
    const discountedNetTotal = Math.max(0, netTotal - generalDiscount);
    const vatTotal = lineSummaries.reduce((sum, line) => sum + line.vatAmount, 0);
    const vatAfterDiscount = netTotal > 0 ? vatTotal * (discountedNetTotal / netTotal) : 0;
    return {
      netTotal,
      lineDiscountTotal: lineSummaries.reduce(
        (sum, line) => sum + line.discountAmount1 + line.discountAmount2 + line.discountAmount3,
        0,
      ),
      generalDiscount,
      vatTotal: vatAfterDiscount,
      grandTotal: discountedNetTotal + vatAfterDiscount,
    };
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
    const invalidDiscountLineIndex = visibleLines.findIndex((line) => !areDiscountRatesValid({
      discountRate1: toNumber(line.discount1),
      discountRate2: toNumber(line.discount2),
      discountRate3: toNumber(line.discount3),
    }));
    if (invalidDiscountLineIndex >= 0) {
      throw new Error(`${invalidDiscountLineIndex + 1}. satırdaki kademeli iskonto efektif %100 değerine ulaşamaz.`);
    }
    if (!isRequest && currencyCode.trim().toUpperCase() !== 'TL' && toNumber(exchangeRate, 0) <= 0) {
      throw new Error('TL dışındaki satınalma belgelerinde kur 0 olamaz.');
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

  const applySelectedProductToLine = (product: ProductSelectionResult, preferredIndex: number | null) => {
    setLines((current) => {
      const nextLine: PurchaseLineForm = {
        ...createEmptyLine(),
        productCode: product.code,
        productName: product.name,
        unit: product.unit || '',
        vatRate: product.vatRate != null ? String(product.vatRate) : '20',
      };

      const targetIndex =
        preferredIndex != null
          ? preferredIndex
          : current.findIndex((line) => !line.productCode.trim() && !line.productName.trim());

      if (targetIndex >= 0 && targetIndex < current.length) {
        return current.map((line, lineIndex) =>
          lineIndex === targetIndex
            ? {
                ...line,
                productCode: product.code,
                productName: product.name,
                unit: product.unit || line.unit,
                vatRate: product.vatRate != null ? String(product.vatRate) : line.vatRate,
              }
            : line,
        );
      }

      return [...current, nextLine];
    });
  };

  const handleProductSelect = (product: ProductSelectionResult) => {
    applySelectedProductToLine(product, targetLineIndex);
    setTargetLineIndex(null);
    setProductDialogOpen(false);
  };

  const openProductDialogForLine = (index: number | null) => {
    setTargetLineIndex(index);
    setProductDialogOpen(true);
  };

  const updateExchangeRate = (index: number, patch: Partial<ExchangeRateForm>) => {
    setExchangeRates((current) => current.map((rate, rateIndex) => (rateIndex === index ? { ...rate, ...patch } : rate)));
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-4 py-6 text-[var(--crm-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-[8px] border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-[#130d21]">
              <Link to={config.listPath} aria-label="Listeye dön">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">{config.title}</h1>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-[var(--crm-brand-primary)] shadow-[0_0_8px_color-mix(in_srgb,var(--crm-brand-primary)_65%,transparent)]" />
                {config.description}
              </p>
            </div>
          </div>
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="h-12 min-w-[150px] rounded-[8px] bg-linear-to-r from-[var(--crm-brand-primary)] to-[var(--crm-brand-secondary)] font-black text-white shadow-lg"
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? 'Kaydediliyor' : 'Kaydet'}
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={1} icon={FileText} title="Başlık Bilgileri" />
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-white/12 dark:bg-[#100b1a]/80">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <label className="space-y-2">
                      <FieldLabel
                        required={!isRequest}
                        help="Satınalma teklifi ve siparişi mevcut müşteri/cari kartından seçilen ERP entegre tedarikçi ile açılır. Cari kodu olmayan kayıt tedarikçi olarak kullanılamaz."
                      >
                        <Building2 className="h-4 w-4" />
                        Tedarikçi
                      </FieldLabel>
                      {isRequest ? (
                        <Input
                          className={INPUT_CLASSNAME}
                          value="Talep/RFQ aşamasında tedarikçi sonra seçilebilir"
                          disabled
                        />
                      ) : (
                        <PurchaseSupplierCombobox
                          value={supplierId}
                          selectedSupplier={selectedSupplier}
                          onSelect={(supplier) => {
                            setSelectedSupplier(supplier);
                            setSupplierId(supplier?.id.toString() ?? '');
                          }}
                        />
                      )}
                    </label>
                    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Seçili tedarikçi
                      </div>
                      <div className="mt-1 font-black text-slate-900 dark:text-white">
                        {selectedSupplier?.name ?? (isRequest ? 'Talep tedarikçisiz açılabilir' : 'Henüz seçilmedi')}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        ERP Cari Kodu: {selectedSupplier?.customerCode ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-2">
                    <FieldLabel help="Boş bırakılırsa belge operasyon numaralandırması ile sonradan takip edilebilir.">
                      <Hash className="h-4 w-4" />
                      {config.numberLabel}
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} placeholder="Boş bırakılabilir" />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel>
                      <Calendar className="h-4 w-4" />
                      {config.dateLabel}
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel>
                      <Layers className="h-4 w-4" />
                      Departman
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Opsiyonel" />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel>
                      <Package className="h-4 w-4" />
                      Proje Kodu
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={projectCode} onChange={(event) => setProjectCode(event.target.value)} placeholder="Opsiyonel" />
                  </label>
                  {!isRequest ? (
                    <>
                      <label className="space-y-2">
                        <FieldLabel>Satınalma Tipi</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={purchaseType} onChange={(event) => setPurchaseType(event.target.value)} placeholder="Yurtiçi / Yurtdışı / RFQ" />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel>ERP Proje Kodu</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={erpProjectCode} onChange={(event) => setErpProjectCode(event.target.value)} placeholder="Opsiyonel" />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel>Özel Kod 1</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={ozelKod1} onChange={(event) => setOzelKod1(event.target.value)} maxLength={10} />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel>Özel Kod 2</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={ozelKod2} onChange={(event) => setOzelKod2(event.target.value)} maxLength={10} />
                      </label>
                    </>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <FieldLabel>
                    <StickyNote className="h-4 w-4" />
                    Belge Açıklaması
                  </FieldLabel>
                  <Textarea
                    className="min-h-24 rounded-[8px] border-slate-300 bg-white font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-pink-500 focus-visible:ring-pink-200 dark:border-white/15 dark:bg-[#100b1a] dark:text-white"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Satınalma belgesinin tamamını ilgilendiren açıklama"
                  />
                </label>
              </div>
            </section>

            {!isRequest ? (
              <section className={SECTION_CARD_CLASSNAME}>
                <SectionTitle index={2} icon={CreditCard} title="Finans, Kur ve İskonto" />
                <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.15fr]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <FieldLabel required>
                        <Wallet className="h-4 w-4" />
                        Para Birimi
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel required>
                        <ArrowRightLeft className="h-4 w-4" />
                        Kur
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} inputMode="decimal" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>
                        <CreditCard className="h-4 w-4" />
                        Ödeme Tipi ID
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={paymentTypeId} onChange={(event) => setPaymentTypeId(event.target.value)} inputMode="numeric" placeholder="Opsiyonel" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>Belge Seri ID</FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={documentSerialTypeId} onChange={(event) => setDocumentSerialTypeId(event.target.value)} inputMode="numeric" placeholder="Opsiyonel" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>
                        <Percent className="h-4 w-4" />
                        Genel İskonto %
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={generalDiscountRate} onChange={(event) => setGeneralDiscountRate(event.target.value)} inputMode="decimal" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>Genel İskonto Tutarı</FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={generalDiscountAmount} onChange={(event) => setGeneralDiscountAmount(event.target.value)} inputMode="decimal" />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-slate-50/80 p-4 dark:border-white/12 dark:bg-white/[0.04]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white">Döviz Kurları</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Belgedeki kur snapshot bilgileri.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setExchangeRates((current) => [...current, createEmptyExchangeRate()])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Kur Ekle
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {exchangeRates.map((rate, index) => (
                        <div key={rate.clientKey} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_44px]">
                          <Input className={INPUT_CLASSNAME} value={rate.currency} onChange={(event) => updateExchangeRate(index, { currency: event.target.value })} placeholder="DOLAR / EURO / TL" />
                          <Input className={INPUT_CLASSNAME} value={rate.exchangeRate} onChange={(event) => updateExchangeRate(index, { exchangeRate: event.target.value })} inputMode="decimal" placeholder="Kur" />
                          <Input className={INPUT_CLASSNAME} type="date" value={rate.exchangeRateDate} onChange={(event) => updateExchangeRate(index, { exchangeRateDate: event.target.value })} />
                          <Button type="button" variant="outline" size="icon" onClick={() => setExchangeRates((current) => current.filter((_, rateIndex) => rateIndex !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={isRequest ? 2 : 3} icon={Layers} title="Satırlar" />
              <div className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">Satınalma kalemleri</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Profil, demir, vida ve baskı alanları satınalma ekranında özellikle gösterilmez.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Satır Ekle
                  </Button>
                  <Button type="button" variant="outline" onClick={() => openProductDialogForLine(null)}>
                    <Package className="mr-2 h-4 w-4" />
                    Katalogdan Seç
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[1280px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        <th className="w-12 px-4 py-3">#</th>
                        <th className="min-w-[230px] px-3 py-3">Stok Kodu</th>
                        <th className="min-w-[280px] px-3 py-3">Stok / Hizmet Adı</th>
                        <th className="w-28 px-3 py-3">Miktar</th>
                        <th className="w-24 px-3 py-3">Birim</th>
                        {!isRequest ? <th className="w-32 px-3 py-3">Birim Fiyat</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 1</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 2</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 3</th> : null}
                        {!isRequest ? <th className="w-24 px-3 py-3">KDV</th> : null}
                        <th className="w-40 px-3 py-3">Teslim Tarihi</th>
                        {!isRequest ? <th className="w-40 px-3 py-3">Satır Toplam</th> : null}
                        <th className="w-14 px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => {
                        const lineAmounts = calculateLineTotalsAmounts(
                          toNumber(line.unitPrice),
                          toNumber(line.quantity, 1),
                          toNumber(line.discount1),
                          toNumber(line.discount2),
                          toNumber(line.discount3),
                          toNumber(line.vatRate, 20),
                        );
                        const effectiveDiscount = getDiscountRateTotal({
                          discountRate1: toNumber(line.discount1),
                          discountRate2: toNumber(line.discount2),
                          discountRate3: toNumber(line.discount3),
                        });
                        const invalidDiscount = !areDiscountRatesValid({
                          discountRate1: toNumber(line.discount1),
                          discountRate2: toNumber(line.discount2),
                          discountRate3: toNumber(line.discount3),
                        });

                        return (
                          <tr key={line.clientKey} className="align-top odd:bg-white even:bg-slate-50/70 dark:odd:bg-[#100b1a] dark:even:bg-white/[0.03]">
                            <td className="border-b border-slate-200 px-4 py-3 font-black text-slate-500 dark:border-white/10">{index + 1}</td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <div className="flex gap-2">
                                <Input className={INPUT_CLASSNAME} value={line.productCode} onChange={(event) => updateLine(index, { productCode: event.target.value })} placeholder="Stok kodu" />
                                <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-[8px]" onClick={() => openProductDialogForLine(index)}>
                                  <Package className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Ürün/hizmet adı" />
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} inputMode="decimal" />
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} placeholder="AD" />
                            </td>
                            {!isRequest ? (
                              <>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount1} onChange={(event) => updateLine(index, { discount1: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount2} onChange={(event) => updateLine(index, { discount2: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount3} onChange={(event) => updateLine(index, { discount3: event.target.value })} inputMode="decimal" />
                                  {invalidDiscount ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500">Efektif iskonto %100 olamaz.</p>
                                  ) : (
                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">Efektif %{effectiveDiscount.toFixed(2)}</p>
                                  )}
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.vatRate} onChange={(event) => updateLine(index, { vatRate: event.target.value })} inputMode="decimal" />
                                </td>
                              </>
                            ) : null}
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} type="date" value={line.deliveryDate} onChange={(event) => updateLine(index, { deliveryDate: event.target.value })} />
                            </td>
                            {!isRequest ? (
                              <td className="border-b border-slate-200 px-3 py-3 font-black text-slate-900 dark:border-white/10 dark:text-white">
                                {formatMoney(lineAmounts.lineGrandTotal, currencyCode)}
                              </td>
                            ) : null}
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10 md:grid-cols-2 xl:grid-cols-4">
                  {lines.map((line, index) => (
                    <div key={`${line.clientKey}-details`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Satır {index + 1} detayları</span>
                        <span className="text-[11px] font-bold text-slate-400">{line.productCode || '-'}</span>
                      </div>
                      <div className="space-y-3">
                        <Input className={INPUT_CLASSNAME} value={line.erpProjectCode} onChange={(event) => updateLine(index, { erpProjectCode: event.target.value })} placeholder="Satır ERP proje kodu" />
                        <Input className={INPUT_CLASSNAME} value={line.description1} onChange={(event) => updateLine(index, { description1: event.target.value })} placeholder="Açıklama 1" />
                        <Input className={INPUT_CLASSNAME} value={line.description2} onChange={(event) => updateLine(index, { description2: event.target.value })} placeholder="Açıklama 2" />
                        <Input className={INPUT_CLASSNAME} value={line.description3} onChange={(event) => updateLine(index, { description3: event.target.value })} placeholder="Açıklama 3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {!isRequest ? (
              <section className={SECTION_CARD_CLASSNAME}>
                <SectionTitle index={4} icon={StickyNote} title="Belge Notları" />
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {notes.map((note, index) => (
                    <label key={index} className="space-y-2">
                      <FieldLabel>Not {index + 1}</FieldLabel>
                      <Input
                        className={INPUT_CLASSNAME}
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
          </main>

          <aside className="xl:sticky xl:top-6">
            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={isRequest ? 3 : 5} icon={Calculator} title="Özet" />
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span>Satır Sayısı</span>
                    <span className="text-slate-950 dark:text-white">{visibleLines.length}</span>
                  </div>
                </div>
                {!isRequest ? (
                  <>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Ara Toplam</span>
                        <strong className="text-slate-950 dark:text-white">{formatMoney(totals.netTotal, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Satır İskonto</span>
                        <strong className="text-red-600 dark:text-red-400">-{formatMoney(totals.lineDiscountTotal, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Genel İskonto</span>
                        <strong className="text-red-600 dark:text-red-400">-{formatMoney(totals.generalDiscount, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Toplam KDV</span>
                        <strong className="text-slate-950 dark:text-white">{formatMoney(totals.vatTotal, currencyCode)}</strong>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--crm-brand-primary)]/30 bg-[var(--crm-brand-primary)]/10 p-4">
                      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--crm-brand-primary)]">Genel Toplam</div>
                      <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {formatMoney(totals.grandTotal, currencyCode)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Satınalma talebi tedarikçisiz ihtiyaç kaydıdır. RFQ ya da tedarikçi teklifine dönüştürülürken tedarikçi ve fiyat bilgisi detaylandırılır.
                  </div>
                )}
                <Button
                  type="button"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="h-12 w-full rounded-[8px] bg-linear-to-r from-[var(--crm-brand-primary)] to-[var(--crm-brand-secondary)] font-black text-white shadow-lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createMutation.isPending ? 'Kaydediliyor' : 'Kaydet'}
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) {
            setTargetLineIndex(null);
          }
        }}
        onSelect={handleProductSelect}
        existingLineStockMarkers={existingLineStockMarkers}
        disableRelatedStocks
      />
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
