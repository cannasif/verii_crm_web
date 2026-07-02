import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Info, Mail, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useStockList } from '@/features/stock/hooks/useStockList';
import type { StockGetDto } from '@/features/stock/types';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useIntegratedSupplierSearch } from '@/features/purchase/hooks/useIntegratedSupplierSearch';
import type { ApiResponse } from '@/types/api';

interface RfqLineForm {
  clientKey: string;
  stockId: string;
  stockSearch: string;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
}

interface RfqSupplierForm {
  clientKey: string;
  supplierId: string;
  supplierErpCode: string;
  supplierName: string;
  email: string;
  contactName: string;
}

interface CreatedRfq {
  id: number;
}

const createClientKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptyLine = (): RfqLineForm => ({
  clientKey: createClientKey(),
  stockId: '',
  stockSearch: '',
  productCode: '',
  productName: '',
  quantity: '1',
  unit: '',
});

const createEmptySupplier = (): RfqSupplierForm => ({
  clientKey: createClientKey(),
  supplierId: '',
  supplierErpCode: '',
  supplierName: '',
  email: '',
  contactName: '',
});

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

function RfqLineEditor({
  line,
  index,
  onUpdate,
  onRemove,
}: {
  line: RfqLineForm;
  index: number;
  onUpdate: (index: number, patch: Partial<RfqLineForm>) => void;
  onRemove: (index: number) => void;
}) {
  const stockSearch = line.stockSearch.trim();
  const stockQuery = useStockList(
    {
      pageNumber: 1,
      pageSize: 10,
      search: stockSearch,
      sortBy: 'Id',
      sortDirection: 'desc',
      filters: [],
    },
    { enabled: stockSearch.length >= 2 }
  );

  const stockRows = stockQuery.data?.data ?? [];

  const handleStockSelect = (stock: StockGetDto): void => {
    onUpdate(index, {
      stockId: String(stock.id),
      stockSearch: `${stock.erpStockCode} - ${stock.stockName}`,
      productCode: stock.erpStockCode,
      productName: stock.stockName,
      unit: stock.unit ?? line.unit,
    });
  };

  return (
    <div className="grid gap-3 rounded-[8px] border border-[var(--crm-border)] p-3 md:grid-cols-[1.4fr_1fr_2fr_120px_120px_44px]">
      <div className="relative space-y-2 md:col-span-2">
        <Input
          value={line.stockSearch}
          onChange={(event) => {
            onUpdate(index, {
              stockSearch: event.target.value,
              stockId: '',
            });
          }}
          placeholder="RII_STOK içinde ara veya manuel kalem girin"
        />
        {stockSearch.length >= 2 ? (
          <div className="absolute z-30 max-h-64 w-full overflow-y-auto rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-1 shadow-xl">
            {stockQuery.isFetching ? (
              <div className="px-3 py-2 text-sm text-[var(--crm-text-muted)]">Stoklar aranıyor...</div>
            ) : stockRows.length > 0 ? (
              stockRows.map((stock) => (
                <button
                  key={stock.id}
                  type="button"
                  className="flex w-full flex-col rounded-[6px] px-3 py-2 text-left transition hover:bg-[var(--crm-hover-bg,rgba(148,163,184,0.12))]"
                  onClick={() => handleStockSelect(stock)}
                >
                  <span className="font-mono text-xs text-[var(--crm-brand-primary)]">{stock.erpStockCode}</span>
                  <span className="text-sm font-semibold text-[var(--crm-text-primary)]">{stock.stockName}</span>
                  <span className="text-xs text-[var(--crm-text-muted)]">Birim: {stock.unit || '-'}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-[var(--crm-text-muted)]">Stok bulunamadı; manuel ürün/hizmet adı girebilirsiniz.</div>
            )}
          </div>
        ) : null}
      </div>
      <Input value={line.productCode} onChange={(event) => onUpdate(index, { productCode: event.target.value })} placeholder="Stok kodu" />
      <Input value={line.productName} onChange={(event) => onUpdate(index, { productName: event.target.value })} placeholder="Ürün/hizmet adı" />
      <Input value={line.quantity} onChange={(event) => onUpdate(index, { quantity: event.target.value })} placeholder="Miktar" inputMode="decimal" />
      <Input value={line.unit} onChange={(event) => onUpdate(index, { unit: event.target.value })} placeholder="Birim" />
      <Button type="button" variant="outline" size="icon" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RfqSupplierEditor({
  supplier,
  index,
  onUpdate,
  onRemove,
}: {
  supplier: RfqSupplierForm;
  index: number;
  onUpdate: (index: number, patch: Partial<RfqSupplierForm>) => void;
  onRemove: (index: number) => void;
}) {
  const [supplierSearch, setSupplierSearch] = useState('');
  const supplierQuery = useIntegratedSupplierSearch(supplierSearch);

  const handleSupplierSelect = (value: string | null): void => {
    if (!value) {
      onUpdate(index, {
        supplierId: '',
        supplierErpCode: '',
        supplierName: '',
        email: '',
      });
      return;
    }

    const selectedSupplier = supplierQuery.suppliers.find((item) => item.id.toString() === value);
    if (!selectedSupplier) {
      return;
    }

    onUpdate(index, {
      supplierId: selectedSupplier.id.toString(),
      supplierErpCode: selectedSupplier.customerCode,
      supplierName: selectedSupplier.name,
      email: selectedSupplier.email || supplier.email,
    });
  };

  return (
    <div className="grid gap-3 rounded-[8px] border border-[var(--crm-border)] p-3 md:grid-cols-[1.4fr_1fr_1fr_44px]">
      <VoiceSearchCombobox
        value={supplier.supplierId || null}
        options={supplierQuery.options}
        onSelect={handleSupplierSelect}
        onDebouncedSearchChange={setSupplierSearch}
        onFetchNextPage={() => {
          void supplierQuery.fetchNextPage();
        }}
        hasNextPage={supplierQuery.hasNextPage}
        isLoading={supplierQuery.isLoading || supplierQuery.isFetching}
        isFetchingNextPage={supplierQuery.isFetchingNextPage}
        minChars={supplierQuery.minChars}
        placeholder={supplier.supplierName ? `${supplier.supplierErpCode} - ${supplier.supplierName}` : 'ERP entegre tedarikçi seçin'}
        searchPlaceholder="Cari kodu veya tedarikçi adı ile ara..."
        className="h-12 rounded-[8px] border-[var(--crm-border)] bg-[var(--crm-input-bg)] font-semibold text-[var(--crm-text-primary)]"
        popoverContentClassName="rounded-[8px]"
        disableToggleOff
      />
      <Input value={supplier.email} onChange={(event) => onUpdate(index, { email: event.target.value })} placeholder="E-posta" />
      <Input value={supplier.contactName} onChange={(event) => onUpdate(index, { contactName: event.target.value })} placeholder="Yetkili" />
      <Button type="button" variant="outline" size="icon" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PurchaseRfqCreatePage() {
  const navigate = useNavigate();
  const [rfqNo, setRfqNo] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currencyCode, setCurrencyCode] = useState('TL');
  const [message, setMessage] = useState('Aşağıdaki ürün/hizmetler için fiyat teklifinizi iletmenizi rica ederiz.');
  const [lines, setLines] = useState<RfqLineForm[]>([createEmptyLine()]);
  const [suppliers, setSuppliers] = useState<RfqSupplierForm[]>([createEmptySupplier()]);
  const { currencyOptions, isLoading: isCurrencyLoading } = useCurrencyOptions();
  const selectedSupplierCount = suppliers.filter((supplier) => supplier.supplierId).length;
  const visibleLines = lines.filter((line) => line.productName.trim());
  const previewSubject = subject.trim() || 'Satınalma teklif talebi';

  const createMutation = useMutation({
    mutationFn: async (sendAfterCreate: boolean) => {
      const payload = buildPayload();
      const response = await api.post<ApiResponse<CreatedRfq>>('/api/PurchaseRfq', payload);
      if (!response.success || !response.data?.id) {
        throw new Error(response.message || 'Teklif isteği oluşturulamadı.');
      }

      if (sendAfterCreate) {
        const sendResponse = await api.post<ApiResponse<unknown>>(`/api/PurchaseRfq/${response.data.id}/send-to-suppliers`, {
          subject,
          message,
        });
        if (!sendResponse.success) {
          throw new Error(sendResponse.message || 'Teklif isteği oluşturuldu ancak mail gönderilemedi.');
        }
      }

      return response.data.id;
    },
    onSuccess: (id) => {
      toast.success('Teklif isteği kaydedildi.');
      navigate(`/purchase/rfqs?created=${id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Teklif isteği kaydedilemedi.');
    },
  });

  const buildPayload = () => {
    const validLines = lines
      .filter((line) => line.productName.trim())
      .map((line) => ({
        stockId: line.stockId ? Number(line.stockId) : null,
        productCode: line.productCode.trim() || null,
        productName: line.productName.trim(),
        quantity: Number(line.quantity.replace(',', '.')) || 0,
        unit: line.unit.trim() || null,
      }));

    const validSuppliers = suppliers
      .filter((supplier) => supplier.supplierId)
      .map((supplier) => {
        if (!supplier.supplierErpCode.trim() || !supplier.supplierName.trim()) {
          throw new Error('RFQ tedarikçileri mevcut ERP entegre cari listesinden seçilmelidir.');
        }

        return {
          supplierId: Number(supplier.supplierId),
          supplierErpCode: supplier.supplierErpCode,
          supplierNameSnapshot: supplier.supplierName,
          email: supplier.email.trim(),
          contactName: supplier.contactName.trim() || null,
        };
      });

    if (!validLines.length) {
      throw new Error('En az bir RFQ satırı girilmelidir.');
    }
    if (!validSuppliers.length) {
      throw new Error('En az bir ERP entegre tedarikçi seçilmelidir.');
    }

    return {
      rfqNo: rfqNo.trim() || null,
      subject: subject.trim() || null,
      dueDate: dueDate || null,
      currencyCode: currencyCode.trim() || 'TL',
      message: message.trim() || null,
      lines: validLines,
      suppliers: validSuppliers,
    };
  };

  const updateLine = (index: number, patch: Partial<RfqLineForm>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const updateSupplier = (index: number, patch: Partial<RfqSupplierForm>) => {
    setSuppliers((current) => current.map((supplier, supplierIndex) => (supplierIndex === index ? { ...supplier, ...patch } : supplier)));
  };

  const removeSupplier = (index: number): void => {
    setSuppliers((current) => (current.length === 1 ? [createEmptySupplier()] : current.filter((_, supplierIndex) => supplierIndex !== index)));
  };

  const removeLine = (index: number): void => {
    setLines((current) => (current.length === 1 ? [createEmptyLine()] : current.filter((_, lineIndex) => lineIndex !== index)));
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-6 py-8 text-[var(--crm-text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" className="h-11 w-11">
              <Link to="/purchase/rfqs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Yeni Teklif İsteği (RFQ)</h1>
              <p className="mt-1 text-sm text-[var(--crm-text-muted)]">
                Bir satınalma ihtiyacını birden fazla tedarikçiye e-posta ile gönderebilirsiniz.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-[8px] border border-[var(--crm-info-border,#93c5fd)] bg-[var(--crm-info-bg,rgba(59,130,246,0.08))] p-4 text-sm leading-6 text-[var(--crm-text-secondary)]">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--crm-brand-primary)]" />
            <div>
              <p className="font-semibold text-[var(--crm-text-primary)]">Talep carisiz başlayabilir; tedarikçiler RFQ aşamasında ERP entegre cari listesinden seçilir.</p>
              <p>
                Satınalma talebi iç ihtiyaçtır. Bu ekranda aynı ihtiyacı bir veya daha fazla tedarikçiye teklif isteme maili olarak
                gönderebilirsiniz. Gelen cevaplar tedarikçi teklifi olarak karşılaştırılır, seçilen teklif satınalma siparişine döner.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                RFQ No
                <FieldHelp text="Teklif isteme belgesinin numarasıdır. Boş bırakılırsa sistem/operasyon ekibi sonradan numaralandırabilir." />
              </span>
              <Input value={rfqNo} onChange={(event) => setRfqNo(event.target.value)} placeholder="Boş bırakılabilir" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                Konu
                <FieldHelp text="Tedarikçiye gidecek mail başlığıdır. Örn: PVC profil alımı teklif talebi." />
              </span>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Teklif talebi konusu" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                Son Teklif Tarihi
                <FieldHelp text="Tedarikçiden teklif cevabının beklendiği son tarihtir. Sipariş tarihi değildir." />
              </span>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                Para Birimi
                <FieldHelp text="RFQ satırlarının ve tedarikçi teklif karşılaştırmasının baz para birimidir. ERP döviz tanımlarından gelen liste kullanılır." />
              </span>
              <select
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
                disabled={isCurrencyLoading}
                className="flex h-12 w-full rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-input-bg)] px-3 text-sm font-semibold text-[var(--crm-text-primary)] outline-none transition focus:border-[var(--crm-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="TL">{isCurrencyLoading ? 'Dövizler yükleniyor...' : 'TL'}</option>
                {currencyOptions.map((currency) => (
                  <option key={currency.dovizTipi} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--crm-text-muted)]">
                Mail Mesajı
                <FieldHelp text="Bu metin seçilen tüm tedarikçilere gönderilir; satırlar mail içinde tablo olarak ayrıca gösterilir." />
              </span>
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
            </label>
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Satırlar
              <FieldHelp text="Talep satırları veya manuel girilen ihtiyaç satırlarıdır. Tedarikçiden fiyat istenecek ürün/hizmetler burada yer alır." />
            </h2>
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              Satır Ekle
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <RfqLineEditor key={line.clientKey} line={line} index={index} onUpdate={updateLine} onRemove={removeLine} />
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Tedarikçiler
              <FieldHelp text="Teklif alınacak tedarikçiler mevcut müşteri/cari listesinden seçilir. Yalnızca ERP'ye entegre ve cari kodu dolu kayıtlar kullanılabilir." />
            </h2>
            <Button type="button" variant="outline" onClick={() => setSuppliers((current) => [...current, createEmptySupplier()])}>
              <Plus className="mr-2 h-4 w-4" />
              Tedarikçi Ekle
            </Button>
          </div>
          <div className="space-y-3">
            {suppliers.map((supplier, index) => (
              <RfqSupplierEditor
                key={supplier.clientKey}
                supplier={supplier}
                index={index}
                onUpdate={updateSupplier}
                onRemove={removeSupplier}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                Mail Taslağı Önizleme
                <FieldHelp text="Kaydet ve gönder işleminde seçili tedarikçilere gidecek temel RFQ içeriğini gönderimden önce kontrol edebilirsiniz." />
              </h2>
              <p className="mt-1 text-sm text-[var(--crm-text-muted)]">
                {selectedSupplierCount} tedarikçi, {visibleLines.length} satır, {currencyCode || 'TL'} baz para birimi.
              </p>
            </div>
          </div>
          <div className="rounded-[8px] border border-dashed border-[var(--crm-border)] bg-[var(--crm-muted-bg,rgba(148,163,184,0.08))] p-4">
            <div className="text-sm font-semibold text-[var(--crm-text-muted)]">Konu</div>
            <div className="mt-1 text-base font-bold text-[var(--crm-text-primary)]">{previewSubject}</div>
            <div className="mt-4 whitespace-pre-wrap rounded-[8px] bg-[var(--crm-input-bg)] p-3 text-sm leading-6 text-[var(--crm-text-secondary)]">
              {message.trim() || 'Aşağıdaki ürün/hizmetler için fiyat teklifinizi iletmenizi rica ederiz.'}
            </div>
            <div className="mt-4 overflow-x-auto rounded-[8px] border border-[var(--crm-border)]">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-[var(--crm-table-header-bg,rgba(148,163,184,0.12))] text-[var(--crm-text-muted)]">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">RII_STOK Kodu</th>
                    <th className="px-3 py-2">Ürün/Hizmet</th>
                    <th className="px-3 py-2">Miktar</th>
                    <th className="px-3 py-2">Birim</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.length ? (
                    visibleLines.map((line, index) => (
                      <tr key={line.clientKey} className="border-t border-[var(--crm-border)]">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-[var(--crm-brand-primary)]">{line.productCode || '-'}</td>
                        <td className="px-3 py-2 font-semibold">{line.productName}</td>
                        <td className="px-3 py-2">{line.quantity || '-'}</td>
                        <td className="px-3 py-2">{line.unit || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-5 text-center text-[var(--crm-text-muted)]" colSpan={5}>
                        Önizleme için en az bir satır girin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" disabled={createMutation.isPending} onClick={() => createMutation.mutate(false)}>
            Kaydet
          </Button>
          <Button type="button" disabled={createMutation.isPending} onClick={() => createMutation.mutate(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Kaydet ve Tedarikçilere Gönder
          </Button>
        </footer>
      </div>
    </div>
  );
}
