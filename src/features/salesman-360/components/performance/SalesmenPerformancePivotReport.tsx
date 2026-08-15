import { type ReactElement, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { exportSheetsToXlsx, type ExcelRow } from '@/lib/xlsx-export';
import type {
  Salesmen360CustomerPerformanceDto,
  Salesmen360DocumentStatusDto,
  Salesmen360PerformanceDto,
  Salesmen360SalesmanPerformanceDto,
  Salesmen360StockPerformanceDto,
} from '../../types/salesmen360.types';
import { Salesmen360ExcelExportButton } from '../Salesmen360ExcelExportButton';
import { SalesMovementPivot, type SalesPivotScope } from './SalesMovementPivot';

export type PerformanceReportSection = SalesPivotScope;

function statusOf(row: Salesmen360SalesmanPerformanceDto, type: string): Salesmen360DocumentStatusDto {
  return row.documentStatuses?.find((item) => item.documentType === type) ?? {
    documentType: type,
    total: 0,
    draft: 0,
    waiting: 0,
    approved: 0,
    rejected: 0,
    closed: 0,
    customerCancelled: 0,
    revision: 0,
  };
}

function personName(row: Salesmen360SalesmanPerformanceDto): string {
  return row.fullName || row.email || String(row.userId);
}

function aggregateCustomers(rows: Salesmen360CustomerPerformanceDto[]): Salesmen360CustomerPerformanceDto[] {
  const result = new Map<string, Salesmen360CustomerPerformanceDto>();
  for (const row of rows) {
    const key = `${row.customerId ?? row.customerCode}|${row.customerName}|${row.currency}`;
    const current = result.get(key) ?? {
      ...row,
      salesmanId: 0,
      salesmanName: 'Seçili ekip',
      demandCount: 0,
      demandAmount: 0,
      quotationCount: 0,
      quotationAmount: 0,
      orderCount: 0,
      orderAmount: 0,
      erpOrderCount: 0,
      erpOrderAmount: 0,
    };
    current.demandCount += row.demandCount;
    current.demandAmount += row.demandAmount;
    current.quotationCount += row.quotationCount;
    current.quotationAmount += row.quotationAmount;
    current.orderCount += row.orderCount;
    current.orderAmount += row.orderAmount;
    current.erpOrderCount += row.erpOrderCount;
    current.erpOrderAmount += row.erpOrderAmount;
    result.set(key, current);
  }
  return Array.from(result.values()).sort((a, b) => b.erpOrderAmount - a.erpOrderAmount || b.orderAmount - a.orderAmount);
}

function aggregateStocks(rows: Salesmen360StockPerformanceDto[]): Salesmen360StockPerformanceDto[] {
  const result = new Map<string, Salesmen360StockPerformanceDto>();
  for (const row of rows) {
    const key = `${row.stockCode}|${row.currency}`;
    const current = result.get(key) ?? {
      ...row,
      salesmanId: 0,
      salesmanName: 'Seçili ekip',
      demandDocumentCount: 0,
      demandQuantity: 0,
      demandAmount: 0,
      quotationDocumentCount: 0,
      quotationQuantity: 0,
      quotationAmount: 0,
      orderDocumentCount: 0,
      orderQuantity: 0,
      orderAmount: 0,
      erpOrderDocumentCount: 0,
      erpOrderQuantity: 0,
      erpOrderAmount: 0,
    };
    current.demandDocumentCount += row.demandDocumentCount;
    current.demandQuantity += row.demandQuantity;
    current.demandAmount += row.demandAmount;
    current.quotationDocumentCount += row.quotationDocumentCount;
    current.quotationQuantity += row.quotationQuantity;
    current.quotationAmount += row.quotationAmount;
    current.orderDocumentCount += row.orderDocumentCount;
    current.orderQuantity += row.orderQuantity;
    current.orderAmount += row.orderAmount;
    current.erpOrderDocumentCount += row.erpOrderDocumentCount;
    current.erpOrderQuantity += row.erpOrderQuantity;
    current.erpOrderAmount += row.erpOrderAmount;
    result.set(key, current);
  }
  return Array.from(result.values()).sort((a, b) => b.erpOrderAmount - a.erpOrderAmount || b.orderAmount - a.orderAmount);
}

export function SalesmenPerformancePivotReport({ data, locale, report }: {
  data: Salesmen360PerformanceDto;
  locale: string;
  report: PerformanceReportSection;
}): ReactElement {
  const [isExporting, setIsExporting] = useState(false);
  const rows = data.salesmen;
  const selectedIds = useMemo(() => rows.map((row) => row.userId), [rows]);
  const currencies = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.financialsByCurrency.map((item) => item.currency)))),
    [rows],
  );
  const activityTypes = useMemo(
    () => Array.from(new Map(rows.flatMap((row) => row.activityTypes.map((item) => [item.activityTypeId, item] as const))).values()),
    [rows],
  );
  const customerDetails = useMemo(
    () => (data.customerBreakdown ?? []).filter((row) => selectedIds.includes(row.salesmanId)),
    [data.customerBreakdown, selectedIds],
  );
  const stockDetails = useMemo(
    () => (data.stockBreakdown ?? []).filter((row) => selectedIds.includes(row.salesmanId)),
    [data.stockBreakdown, selectedIds],
  );
  const cumulativeCustomers = useMemo(() => aggregateCustomers(customerDetails), [customerDetails]);
  const cumulativeStocks = useMemo(() => aggregateStocks(stockDetails), [stockDetails]);
  const selectedFinancials = useMemo(() => currencies.map((currency) => ({
    currency,
    quotationAmount: rows.reduce((sum, row) => sum + (row.financialsByCurrency.find((item) => item.currency === currency)?.quotationAmount ?? 0), 0),
    orderAmount: rows.reduce((sum, row) => sum + (row.financialsByCurrency.find((item) => item.currency === currency)?.orderAmount ?? 0), 0),
    erpOrderAmount: rows.reduce((sum, row) => sum + (row.financialsByCurrency.find((item) => item.currency === currency)?.erpOrderAmount ?? 0), 0),
  })), [currencies, rows]);
  const number = (value: number): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value ?? 0);

  const statusExcel = (type: 'demand' | 'quotation' | 'order'): ExcelRow[] => [
    ['Satışçı', 'Toplam', 'Taslak', 'Onayda', 'Onaylanan', 'Reddedilen', 'Kapatılan', 'Müşteri İptali', 'Revizyon'],
    ...rows.map((row) => {
      const status = statusOf(row, type);
      return [personName(row), status.total, status.draft, status.waiting, status.approved, status.rejected, status.closed, status.customerCancelled, status.revision];
    }),
  ];
  const salesExcel: ExcelRow[] = [
    ['Satışçı', 'Talep', 'Teklife Dönen Talep', 'Teklif', 'Siparişe Dönen Teklif', 'Sipariş', 'ERP Sipariş', 'Müşteri', ...currencies.flatMap((currency) => [`Teklif (${currency})`, `Sipariş (${currency})`, `ERP (${currency})`])],
    ...rows.map((row) => [personName(row), row.totalDemands, row.convertedDemands, row.totalQuotations, row.convertedQuotations, row.totalOrders, row.erpIntegratedOrders, row.totalCustomers, ...currencies.flatMap((currency) => {
      const amount = row.financialsByCurrency.find((item) => item.currency === currency);
      return [amount?.quotationAmount ?? 0, amount?.orderAmount ?? 0, amount?.erpOrderAmount ?? 0];
    })]),
  ];
  const activityExcel: ExcelRow[] = [
    ['Satışçı', 'Toplam', 'Tamamlanan', 'Planlanan', 'İptal', 'Geciken', 'Tamamlama %', ...activityTypes.flatMap((type) => [`${type.activityTypeName} Toplam`, `${type.activityTypeName} Tamamlanan`])],
    ...rows.map((row) => [personName(row), row.totalActivities, row.completedActivities, row.plannedActivities, row.cancelledActivities, row.overdueActivities, row.activityCompletionRate, ...activityTypes.flatMap((type) => {
      const item = row.activityTypes.find((candidate) => candidate.activityTypeId === type.activityTypeId);
      return [item?.count ?? 0, item?.completedCount ?? 0];
    })]),
  ];
  const customerExcel = (items: Salesmen360CustomerPerformanceDto[], includeSalesman: boolean): ExcelRow[] => [
    [...(includeSalesman ? ['Satışçı'] : []), 'Cari Kodu', 'Cari Adı', 'Döviz', 'Talep', 'Talep Tutarı', 'Teklif', 'Teklif Tutarı', 'Sipariş', 'Sipariş Tutarı', 'ERP Sipariş', 'ERP Tutarı'],
    ...items.map((row) => [...(includeSalesman ? [row.salesmanName] : []), row.customerCode, row.customerName, row.currency, row.demandCount, row.demandAmount, row.quotationCount, row.quotationAmount, row.orderCount, row.orderAmount, row.erpOrderCount, row.erpOrderAmount]),
  ];
  const stockExcel = (items: Salesmen360StockPerformanceDto[], includeSalesman: boolean): ExcelRow[] => [
    [...(includeSalesman ? ['Satışçı'] : []), 'Stok Kodu', 'Stok Adı', 'Döviz', 'Talep Belge', 'Talep Miktar', 'Talep Tutar', 'Teklif Belge', 'Teklif Miktar', 'Teklif Tutar', 'Sipariş Belge', 'Sipariş Miktar', 'Sipariş Tutar', 'ERP Belge', 'ERP Miktar', 'ERP Tutar'],
    ...items.map((row) => [...(includeSalesman ? [row.salesmanName] : []), row.stockCode, row.stockName, row.currency, row.demandDocumentCount, row.demandQuantity, row.demandAmount, row.quotationDocumentCount, row.quotationQuantity, row.quotationAmount, row.orderDocumentCount, row.orderQuantity, row.orderAmount, row.erpOrderDocumentCount, row.erpOrderQuantity, row.erpOrderAmount]),
  ];

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      await exportSheetsToXlsx(`satis-performans-${data.period.startDate.slice(0, 10)}-${data.period.endDate.slice(0, 10)}`, [
        { name: 'Yönetim Özeti', rows: [
          ['Dönem', `${data.period.startDate.slice(0, 10)} - ${data.period.endDate.slice(0, 10)}`],
          ['Seçili Satışçı', rows.length],
          ['Toplam Teklif', rows.reduce((sum, row) => sum + row.totalQuotations, 0)],
          ['Toplam Sipariş', rows.reduce((sum, row) => sum + row.totalOrders, 0)],
          ['ERP Sipariş', rows.reduce((sum, row) => sum + row.erpIntegratedOrders, 0)],
          [],
          ['Döviz', 'Teklif Tutarı', 'Sipariş Tutarı', 'ERP Tutarı'],
          ...selectedFinancials.map((item) => [item.currency, item.quotationAmount, item.orderAmount, item.erpOrderAmount]),
        ] },
        { name: 'Satış Performansı', rows: salesExcel },
        { name: 'Talep Performansı', rows: statusExcel('demand') },
        { name: 'Teklif Performansı', rows: statusExcel('quotation') },
        { name: 'Sipariş Performansı', rows: statusExcel('order') },
        { name: 'Aktivite Performansı', rows: activityExcel },
        { name: 'Cari Kümüle', rows: customerExcel(cumulativeCustomers, false) },
        { name: 'Cari Satışçı Detay', rows: customerExcel(customerDetails, true) },
        { name: 'Stok Kümüle', rows: stockExcel(cumulativeStocks, false) },
        { name: 'Stok Satışçı Detay', rows: stockExcel(stockDetails, true) },
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedTotals = useMemo(() => ({
    people: rows.length,
    quotations: rows.reduce((sum, row) => sum + row.totalQuotations, 0),
    orders: rows.reduce((sum, row) => sum + row.totalOrders, 0),
    erpOrders: rows.reduce((sum, row) => sum + row.erpIntegratedOrders, 0),
    activities: rows.reduce((sum, row) => sum + row.totalActivities, 0),
    customers: new Set(customerDetails.map((row) => row.customerId ?? `${row.customerCode}|${row.customerName}`)).size,
    stocks: new Set(stockDetails.map((row) => row.stockCode)).size,
  }), [customerDetails, rows, stockDetails]);
  const reportTitle: Record<PerformanceReportSection, string> = {
    movement: 'Dönem içi satış hareketleri',
    sales: 'Satışçı performans pivotu',
    demand: 'Talep durum ve dönüşüm pivotu',
    quotation: 'Teklif durum ve dönüşüm pivotu',
    order: 'Sipariş durum ve ERP pivotu',
    activity: 'Aktivite performans pivotu',
    customer: 'Cari bazlı satış pivotu',
    stock: 'Stok bazlı satış pivotu',
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#160d20]">
      <div className="sticky top-0 z-40 flex flex-col gap-3 border-b border-slate-200 bg-white/95 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between dark:border-white/10 dark:bg-[#160d20]/95">
        <div>
          <h3 className="flex items-center gap-2 font-black"><BarChart3 className="size-5 text-primary" />{reportTitle[report]}</h3>
          <p className="text-xs text-slate-500">{data.period.startDate.slice(0, 10)} – {data.period.endDate.slice(0, 10)} · Revizyonlar tek belge sayılır</p>
        </div>
        <Salesmen360ExcelExportButton disabled={rows.length === 0} isExporting={isExporting} onClick={() => void handleExport()} />
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4 xl:grid-cols-7 dark:border-white/10 dark:bg-white/10">
        {[
          ['Seçili satışçı', selectedTotals.people],
          ['Teklif', selectedTotals.quotations],
          ['Sipariş', selectedTotals.orders],
          ['ERP sipariş', selectedTotals.erpOrders],
          ['Aktivite', selectedTotals.activities],
          ['Cari', selectedTotals.customers],
          ['Stok', selectedTotals.stocks],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-white px-4 py-3 dark:bg-[#160d20]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {report === 'sales' && selectedFinancials.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/3">
          {selectedFinancials.map((item) => (
            <div key={item.currency} className="min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#160d20]">
              <p className="text-xs font-black text-primary">{item.currency}</p>
              <div className="mt-1 grid grid-cols-3 gap-3 text-xs">
                <span><b className="block text-sm tabular-nums">{number(item.quotationAmount)}</b>Teklif</span>
                <span><b className="block text-sm tabular-nums">{number(item.orderAmount)}</b>Sipariş</span>
                <span><b className="block text-sm tabular-nums text-emerald-600">{number(item.erpOrderAmount)}</b>ERP</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <SalesMovementPivot
        movements={data.salesMovements ?? []}
        locale={locale}
        scope={report}
        reportTitle={reportTitle[report]}
        periodLabel={`${data.period.startDate.slice(0, 10)} – ${data.period.endDate.slice(0, 10)}`}
        periodFileToken={`${data.period.startDate.slice(0, 10)}-${data.period.endDate.slice(0, 10)}`}
      />
    </section>
  );
}
