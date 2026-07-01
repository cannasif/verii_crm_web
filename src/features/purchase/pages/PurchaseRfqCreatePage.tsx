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
import type { ApiResponse } from '@/types/api';

interface RfqLineForm {
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
}

interface RfqSupplierForm {
  supplierNameSnapshot: string;
  email: string;
  contactName: string;
}

interface CreatedRfq {
  id: number;
}

const emptyLine: RfqLineForm = { productCode: '', productName: '', quantity: '1', unit: '' };
const emptySupplier: RfqSupplierForm = { supplierNameSnapshot: '', email: '', contactName: '' };

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

export function PurchaseRfqCreatePage() {
  const navigate = useNavigate();
  const [rfqNo, setRfqNo] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('Aşağıdaki ürün/hizmetler için fiyat teklifinizi iletmenizi rica ederiz.');
  const [lines, setLines] = useState<RfqLineForm[]>([{ ...emptyLine }]);
  const [suppliers, setSuppliers] = useState<RfqSupplierForm[]>([{ ...emptySupplier }]);

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
        productCode: line.productCode.trim() || null,
        productName: line.productName.trim(),
        quantity: Number(line.quantity.replace(',', '.')) || 0,
        unit: line.unit.trim() || null,
      }));

    const validSuppliers = suppliers
      .filter((supplier) => supplier.email.trim())
      .map((supplier) => ({
        supplierNameSnapshot: supplier.supplierNameSnapshot.trim() || supplier.email.trim(),
        email: supplier.email.trim(),
        contactName: supplier.contactName.trim() || null,
      }));

    if (!validLines.length) {
      throw new Error('En az bir RFQ satırı girilmelidir.');
    }
    if (!validSuppliers.length) {
      throw new Error('En az bir tedarikçi e-postası girilmelidir.');
    }

    return {
      rfqNo: rfqNo.trim() || null,
      subject: subject.trim() || null,
      dueDate: dueDate || null,
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
              <p className="font-semibold text-[var(--crm-text-primary)]">Talep carisiz başlayabilir; tedarikçiler RFQ aşamasında seçilir.</p>
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
            <label className="space-y-2 md:col-span-2">
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
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...emptyLine }])}>
              <Plus className="mr-2 h-4 w-4" />
              Satır Ekle
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-[8px] border border-[var(--crm-border)] p-3 md:grid-cols-[1fr_2fr_120px_120px_44px]">
                <Input value={line.productCode} onChange={(event) => updateLine(index, { productCode: event.target.value })} placeholder="Stok kodu" />
                <Input value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Ürün/hizmet adı" />
                <Input value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} placeholder="Miktar" inputMode="decimal" />
                <Input value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} placeholder="Birim" />
                <Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Tedarikçiler
              <FieldHelp text="Talepte cari zorunlu değildir. Teklif alınacak cari/tedarikçiler burada seçilir veya e-posta ile girilir." />
            </h2>
            <Button type="button" variant="outline" onClick={() => setSuppliers((current) => [...current, { ...emptySupplier }])}>
              <Plus className="mr-2 h-4 w-4" />
              Tedarikçi Ekle
            </Button>
          </div>
          <div className="space-y-3">
            {suppliers.map((supplier, index) => (
              <div key={index} className="grid gap-3 rounded-[8px] border border-[var(--crm-border)] p-3 md:grid-cols-[1fr_1fr_1fr_44px]">
                <Input value={supplier.supplierNameSnapshot} onChange={(event) => updateSupplier(index, { supplierNameSnapshot: event.target.value })} placeholder="Tedarikçi adı" />
                <Input value={supplier.email} onChange={(event) => updateSupplier(index, { email: event.target.value })} placeholder="E-posta" />
                <Input value={supplier.contactName} onChange={(event) => updateSupplier(index, { contactName: event.target.value })} placeholder="Yetkili" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSuppliers((current) => current.filter((_, supplierIndex) => supplierIndex !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
