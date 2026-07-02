import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Mail, RefreshCw, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiResponse } from '@/types/api';

interface PurchaseRfqLine {
  id: number;
  lineNo: number;
  productCode?: string | null;
  productName: string;
  quantity: number;
  unit?: string | null;
}

interface PurchaseRfqSupplier {
  id: number;
  supplierId?: number | null;
  supplierErpCode?: string | null;
  supplierNameSnapshot: string;
  email: string;
  contactName?: string | null;
  status: number | string;
  sentAt?: string | null;
  lastError?: string | null;
  supplierQuotationId?: number | null;
}

interface PurchaseRfqDetail {
  id: number;
  status: number | string;
  rfqNo?: string | null;
  rfqDate: string;
  dueDate?: string | null;
  subject?: string | null;
  message?: string | null;
  currencyCode: string;
  lines: PurchaseRfqLine[];
  suppliers: PurchaseRfqSupplier[];
}

interface ConvertResult {
  supplierQuotationId: number;
}

const supplierStatusText: Record<string, string> = {
  '0': 'Taslak',
  '1': 'Kuyrukta',
  '2': 'Gönderildi',
  '3': 'Hatalı',
  '4': 'Cevaplandı',
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function statusLabel(value: string | number): string {
  return supplierStatusText[String(value)] ?? String(value);
}

async function fetchRfq(id: string): Promise<PurchaseRfqDetail> {
  const response = await api.get<ApiResponse<PurchaseRfqDetail>>(`/api/PurchaseRfq/${id}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'RFQ detayı yüklenemedi.');
  }

  return response.data;
}

export function PurchaseRfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['purchase-rfq-detail', id];

  const rfqQuery = useQuery({
    queryKey,
    queryFn: () => fetchRfq(id ?? ''),
    enabled: Boolean(id),
  });

  const convertMutation = useMutation({
    mutationFn: async (supplierRowId: number) => {
      if (!id) throw new Error('RFQ bilgisi bulunamadı.');
      const response = await api.post<ApiResponse<ConvertResult>>(`/api/PurchaseRfq/${id}/suppliers/${supplierRowId}/convert-to-quotation`, {});
      if (!response.success || !response.data?.supplierQuotationId) {
        throw new Error(response.message || 'Tedarikçi teklifine dönüştürülemedi.');
      }

      return response.data.supplierQuotationId;
    },
    onSuccess: async (quotationId) => {
      toast.success(`Tedarikçi teklifi oluşturuldu. #${quotationId}`);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['purchase', 'SupplierQuotation'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Tedarikçi teklifine dönüştürülemedi.');
    },
  });

  const rfq = rfqQuery.data;

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-6 py-8 text-[var(--crm-text-primary)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" className="h-11 w-11">
              <Link to="/purchase/rfqs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">RFQ Detayı</h1>
              <p className="mt-1 text-sm text-[var(--crm-text-muted)]">
                Gönderilen tedarikçileri, mail durumlarını ve tedarikçi teklifine dönüşümü takip edin.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled={rfqQuery.isFetching} onClick={() => void rfqQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </header>

        {rfqQuery.isLoading ? (
          <Card className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)]">
            <CardContent className="p-8 text-sm text-[var(--crm-text-muted)]">RFQ detayı yükleniyor...</CardContent>
          </Card>
        ) : rfqQuery.isError || !rfq ? (
          <Card className="rounded-[8px] border border-[var(--crm-danger-border,#fecaca)] bg-[var(--crm-card-bg)]">
            <CardContent className="p-8 text-sm text-[var(--crm-danger,#dc2626)]">RFQ detayı yüklenemedi.</CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-[var(--crm-brand-primary)]" />
                  {rfq.rfqNo || `RFQ #${rfq.id}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-4">
                <div>
                  <div className="text-[var(--crm-text-muted)]">Konu</div>
                  <div className="font-semibold">{rfq.subject || '-'}</div>
                </div>
                <div>
                  <div className="text-[var(--crm-text-muted)]">Para Birimi</div>
                  <div className="font-semibold">{rfq.currencyCode || 'TL'}</div>
                </div>
                <div>
                  <div className="text-[var(--crm-text-muted)]">RFQ Tarihi</div>
                  <div className="font-semibold">{formatDate(rfq.rfqDate)}</div>
                </div>
                <div>
                  <div className="text-[var(--crm-text-muted)]">Son Teklif Tarihi</div>
                  <div className="font-semibold">{formatDate(rfq.dueDate)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)]">
              <CardHeader>
                <CardTitle>RFQ Satırları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-[8px] border border-[var(--crm-border)]">
                  <table className="w-full min-w-[720px] text-left text-sm">
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
                      {rfq.lines.map((line) => (
                        <tr key={line.id} className="border-t border-[var(--crm-border)]">
                          <td className="px-3 py-2">{line.lineNo}</td>
                          <td className="px-3 py-2 font-mono text-xs">{line.productCode || '-'}</td>
                          <td className="px-3 py-2 font-semibold">{line.productName}</td>
                          <td className="px-3 py-2">{line.quantity}</td>
                          <td className="px-3 py-2">{line.unit || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[var(--crm-brand-primary)]" />
                  Tedarikçi Gönderimleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-[8px] border border-[var(--crm-border)]">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[var(--crm-table-header-bg,rgba(148,163,184,0.12))] text-[var(--crm-text-muted)]">
                      <tr>
                        <th className="px-3 py-2">Tedarikçi</th>
                        <th className="px-3 py-2">Cari Kodu</th>
                        <th className="px-3 py-2">E-posta</th>
                        <th className="px-3 py-2">Durum</th>
                        <th className="px-3 py-2">Gönderim</th>
                        <th className="px-3 py-2">Sonuç</th>
                        <th className="px-3 py-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfq.suppliers.map((supplier) => {
                        const hasQuotation = Boolean(supplier.supplierQuotationId);
                        return (
                          <tr key={supplier.id} className="border-t border-[var(--crm-border)]">
                            <td className="px-3 py-2 font-semibold">{supplier.supplierNameSnapshot}</td>
                            <td className="px-3 py-2 font-mono text-xs">{supplier.supplierErpCode || '-'}</td>
                            <td className="px-3 py-2">{supplier.email || '-'}</td>
                            <td className="px-3 py-2">{statusLabel(supplier.status)}</td>
                            <td className="px-3 py-2">{formatDate(supplier.sentAt)}</td>
                            <td className="px-3 py-2">
                              {hasQuotation ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Teklif #{supplier.supplierQuotationId}
                                </span>
                              ) : supplier.lastError ? (
                                <span className="inline-flex items-center gap-1 text-red-500">
                                  <XCircle className="h-4 w-4" />
                                  {supplier.lastError}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {hasQuotation ? (
                                <Button asChild variant="outline" size="sm">
                                  <Link to={`/purchase/supplier-quotations?created=${supplier.supplierQuotationId}`}>
                                    Teklife Git
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={convertMutation.isPending}
                                  onClick={() => convertMutation.mutate(supplier.id)}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Teklife Dönüştür
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
