import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Warehouse,
} from 'lucide-react';

import { ndiApi, type NetsisCustomerDispatchDto, type NetsisCustomerDispatchLineDto } from '../api/ndi-api';

interface NdiOrderLine {
  id: string;
  orderNo: string;
  customer: string;
  route: string;
  shipmentType: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  remainingQuantity: number;
  unit: string;
  warehouse: string;
  deliveryNote: string;
  status: 'ready' | 'partial' | 'waiting';
}

interface NdiOrder {
  id: string;
  orderNo: string;
  customer: string;
  customerCode: string;
  date: string;
  status: 'open' | 'planned' | 'partial';
  route: string;
  branch: string;
  shipmentType: string;
  defaultWarehouse: string;
  representative: string;
  operationProfile: 'nuray' | 'windoformKapi' | 'disTicaret' | 'sirket24';
  documentType: 'irsaliye' | 'fatura';
  hasShipment: boolean;
  specialCode?: 'K' | 'N';
}

interface NdiTransferRule {
  id: NdiOrder['operationProfile'];
  title: string;
  documentType: NdiOrder['documentType'];
  sourceSerial: string;
  targetCompany: string;
  targetSerial: string;
  shipmentRule: string;
  taxRule: string;
  warehouseRule: string;
  transferNote: string;
}

const statusLabel: Record<NdiOrder['status'], string> = {
  open: 'Açık',
  planned: 'Planlandı',
  partial: 'Parçalı',
};

const lineStatusLabel: Record<NdiOrderLine['status'], string> = {
  ready: 'Hazır',
  partial: 'Kısmi',
  waiting: 'Bekliyor',
};

const transferRules: NdiTransferRule[] = [
  {
    id: 'nuray',
    title: 'NURAY - İrsaliye/Fatura',
    documentType: 'irsaliye',
    sourceSerial: 'NUR',
    targetCompany: 'ŞİRKET24',
    targetSerial: 'Kaynak irsaliye/fatura serisi',
    shipmentRule: 'Cari sevk var ise irsaliye aktarımı zorunlu, yok ise zorunlu değil.',
    taxRule: '1/4 siparişlerde ŞİRKET24 KDV %5, tam satışta %20; NURAY KDV %20.',
    warehouseRule: 'Kaynak depo korunur.',
    transferNote: 'İrsaliye oluşursa otomatik ŞİRKET24 faturası tetiklenir.',
  },
  {
    id: 'windoformKapi',
    title: 'WINDOFORM KAPI',
    documentType: 'irsaliye',
    sourceSerial: 'VIN',
    targetCompany: 'ŞİRKET24',
    targetSerial: 'Kaynak irsaliye/fatura serisi',
    shipmentRule: 'Cari sevk var ise irsaliye zorunlu; özel kod K ise irsaliye zorunlu.',
    taxRule: 'Özel Kod K ihraç kayıtlı KDV 0, Özel Kod N normal satış KDV %20.',
    warehouseRule: 'Kaynak depo korunur.',
    transferNote: 'İrsaliye oluşursa otomatik ŞİRKET24 faturası tetiklenir.',
  },
  {
    id: 'disTicaret',
    title: 'DIŞ TİCARET',
    documentType: 'irsaliye',
    sourceSerial: 'DIS',
    targetCompany: 'ŞİRKET24',
    targetSerial: 'EIR',
    shipmentRule: 'Sevk durumuna bakılmadan aktarım yapılabilir.',
    taxRule: 'KDV 0; gün döviz kuru alınır.',
    warehouseRule: 'Varsayılan depo kodu 100 olmalı.',
    transferNote: 'İrsaliye birleştirme ve toplu aktarım desteklenebilir.',
  },
  {
    id: 'sirket24',
    title: 'ŞİRKET24 Fatura',
    documentType: 'fatura',
    sourceSerial: 'SIP',
    targetCompany: 'ŞİRKET24',
    targetSerial: 'SIP2026',
    shipmentRule: 'Sevk var/yok fark etmez.',
    taxRule: 'KDV 0; resmi evrak oluşmayacak.',
    warehouseRule: 'Depo kuralı yok.',
    transferNote: 'Sadece fatura oluşur.',
  },
];

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

function getOrderPrefix(order: NdiOrder): string {
  return order.orderNo.slice(0, 3).toLocaleUpperCase('tr-TR');
}

function getRule(order: NdiOrder): NdiTransferRule {
  return transferRules.find((rule) => rule.id === order.operationProfile) ?? transferRules[0];
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR');
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function resolveOperationProfile(dispatch: NetsisCustomerDispatchDto): NdiOrder['operationProfile'] {
  const type = normalizeText(dispatch.tipi);
  const exportType = normalizeText(dispatch.exportTipi);

  if (type.includes('dışı') || (exportType && exportType !== '-')) {
    return 'disTicaret';
  }

  return 'windoformKapi';
}

function mapDispatchToOrder(dispatch: NetsisCustomerDispatchDto): NdiOrder {
  const operationProfile = resolveOperationProfile(dispatch);
  const shipmentType = dispatch.exportTipi && dispatch.exportTipi !== '-' ? dispatch.exportTipi : dispatch.tipi || 'İrsaliye';

  return {
    id: dispatch.irsaliyeNo,
    orderNo: dispatch.irsaliyeNo,
    customer: dispatch.cariIsim || dispatch.cariKodu,
    customerCode: dispatch.cariKodu,
    date: formatDate(dispatch.tarih),
    status: operationProfile === 'disTicaret' ? 'partial' : 'open',
    route: [dispatch.tipi, dispatch.teslimCariIsim].filter(Boolean).join(' / ') || '-',
    branch: dispatch.teslimCariKodu || dispatch.cariKodu || '-',
    shipmentType,
    defaultWarehouse: dispatch.teslimCariKodu || 'NDI',
    representative: dispatch.plasiyerAciklama || dispatch.plasiyerKodu || '-',
    operationProfile,
    documentType: 'irsaliye',
    hasShipment: true,
    specialCode: operationProfile === 'disTicaret' ? 'K' : 'N',
  };
}

function mapDispatchLine(line: NetsisCustomerDispatchLineDto, index: number, order?: NdiOrder): NdiOrderLine {
  const remainingQuantity = Number(line.bakiye ?? 0);
  const quantity = Number(line.miktar ?? 0);

  return {
    id: `${line.fisNo}::${line.stokKodu}::${index}`,
    orderNo: line.fisNo,
    customer: order?.customer || line.cariKodu || '-',
    route: order?.route || '-',
    shipmentType: order?.shipmentType || '-',
    stockCode: line.stokKodu,
    stockName: line.stokAdi || line.stokKodu,
    quantity,
    remainingQuantity,
    unit: line.olcuBr || '-',
    warehouse: order?.defaultWarehouse || 'NDI',
    deliveryNote: line.cariKodu || order?.customerCode || '-',
    status: remainingQuantity <= 0 ? 'waiting' : remainingQuantity < quantity ? 'partial' : 'ready',
  };
}

export function NdiOrderTransferDemoPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const initializedSelectionRef = useRef(false);

  const dispatchesQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatches'],
    queryFn: ndiApi.getCustomerDispatches,
    staleTime: 60_000,
  });

  const orders = useMemo(() => (dispatchesQuery.data ?? []).map(mapDispatchToOrder), [dispatchesQuery.data]);
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  useEffect(() => {
    if (initializedSelectionRef.current || orders.length === 0) {
      return;
    }

    const firstPrefix = getOrderPrefix(orders[0]);
    const initialGroup = orders.filter((order) => getOrderPrefix(order) === firstPrefix).slice(0, 2);
    setSelectedOrderIds(new Set(initialGroup.map((order) => order.id)));
    initializedSelectionRef.current = true;
  }, [orders]);

  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);
  const selectedPrefix = selectedOrders[0] ? getOrderPrefix(selectedOrders[0]) : orders[0] ? getOrderPrefix(orders[0]) : '-';
  const selectedIrsNoList = useMemo(() => selectedOrders.map((order) => order.orderNo).join(','), [selectedOrders]);

  const linesQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatch-lines', selectedIrsNoList],
    queryFn: () => ndiApi.getCustomerDispatchLines(selectedIrsNoList),
    enabled: selectedIrsNoList.length > 0,
    staleTime: 30_000,
  });

  const selectedOrderLines = useMemo(
    () => (linesQuery.data ?? []).map((line, index) => mapDispatchLine(line, index, ordersById.get(line.fisNo))),
    [linesQuery.data, ordersById]
  );

  const lineIdsKey = useMemo(() => selectedOrderLines.map((line) => line.id).join('|'), [selectedOrderLines]);

  useEffect(() => {
    if (!lineIdsKey) {
      setSelectedLineIds((current) => (current.size === 0 ? current : new Set()));
      return;
    }

    const currentLineIds = selectedOrderLines.map((line) => line.id);
    setSelectedLineIds((current) => {
      const retained = currentLineIds.filter((lineId) => current.has(lineId));
      const nextIds = retained.length > 0 ? retained : currentLineIds;

      if (nextIds.length === current.size && nextIds.every((lineId) => current.has(lineId))) {
        return current;
      }

      return new Set(nextIds);
    });
  }, [lineIdsKey, selectedOrderLines]);

  const lineCountByOrderNo = useMemo(() => {
    const counts = new Map<string, number>();
    selectedOrderLines.forEach((line) => counts.set(line.orderNo, (counts.get(line.orderNo) ?? 0) + 1));
    return counts;
  }, [selectedOrderLines]);

  const filteredOrders = useMemo(() => {
    const tokens = normalizeText(search).split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return orders;
    }

    return orders.filter((order) => {
      const haystack = normalizeText([
        order.orderNo,
        order.customer,
        order.customerCode,
        order.route,
        order.branch,
        order.shipmentType,
        order.defaultWarehouse,
        order.representative,
      ].join(' '));

      return tokens.every((token) => haystack.includes(token));
    });
  }, [orders, search]);

  const selectedLines = selectedOrderLines.filter((line) => selectedLineIds.has(line.id));
  const selectedQuantity = selectedLines.reduce((total, line) => total + line.remainingQuantity, 0);
  const selectedWarehouses = Array.from(new Set(selectedOrderLines.map((line) => line.warehouse)));
  const selectedShipmentTypes = Array.from(new Set(selectedOrders.map((order) => order.shipmentType)));
  const selectedRepresentatives = Array.from(new Set(selectedOrders.map((order) => order.representative)));
  const selectedRules = Array.from(new Map(selectedOrders.map((order) => [order.operationProfile, getRule(order)])).values());
  const selectedRuleTitles = selectedRules.map((rule) => rule.title).join(', ');
  const hasMandatoryShipment = selectedOrders.some((order) => {
    const rule = getRule(order);
    return rule.id === 'windoformKapi' ? order.hasShipment || order.specialCode === 'K' : rule.id === 'nuray' && order.hasShipment;
  });
  const hasFixedWarehouse = selectedOrders.some((order) => getRule(order).warehouseRule.includes('100'));

  const toggleOrder = (order: NdiOrder) => {
    setSelectedOrderIds((current) => {
      const currentOrders = orders.filter((item) => current.has(item.id));
      const currentPrefix = currentOrders[0] ? getOrderPrefix(currentOrders[0]) : getOrderPrefix(order);
      const orderPrefix = getOrderPrefix(order);
      const next = orderPrefix === currentPrefix ? new Set(current) : new Set<string>();

      if (next.has(order.id)) {
        next.delete(order.id);
      } else {
        next.add(order.id);
      }

      return next.size > 0 ? next : new Set([order.id]);
    });
  };

  const toggleLine = (lineId: string) => {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const toggleAllLines = () => {
    setSelectedLineIds((current) => {
      const allLineIds = selectedOrderLines.map((line) => line.id);
      const selectedInGroupCount = allLineIds.filter((lineId) => current.has(lineId)).length;

      if (selectedInGroupCount === allLineIds.length) {
        return new Set();
      }

      return new Set(allLineIds);
    });
  };

  const resetSelection = () => {
    setSearch('');
    initializedSelectionRef.current = false;
    setSelectedOrderIds(new Set());
    setSelectedLineIds(new Set());
    void dispatchesQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <div className="border-b border-[#d9e2ef] bg-[#0f1b2e] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#8fb4ff]">NDI</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">İrsaliye Kalem Seçim Konsolu</h1>
            <p className="mt-1 text-sm font-semibold text-[#b8c7dd]">
              Netsis irsaliyeleri listelenir; ilk 3 karakteri aynı belgeler birlikte seçilir ve satırları aktarım için hazırlanır.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricPill label="Grup" value={`${selectedPrefix} / ${selectedOrders.length} belge`} />
            <MetricPill label="Seçili Kalem" value={String(selectedLines.length)} />
            <MetricPill label="Miktar" value={numberFormatter.format(selectedQuantity)} />
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1540px] gap-4 px-6 py-5 xl:grid-cols-[430px_1fr]">
        <section className="rounded-lg border border-[#d7e1ef] bg-white shadow-sm">
          <div className="border-b border-[#d7e1ef] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1f5eff]">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-black">İrsaliyeler</h2>
                <p className="text-xs font-semibold text-[#6b7b91]">Aynı prefix grubundan birden fazla irsaliye seçin.</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#cdd8e7] bg-[#f8fbff] px-3 py-2 focus-within:border-[#1f5eff]">
                <Search size={18} className="text-[#51709a]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#8fa1b8]"
                  placeholder="İrsaliye, müşteri, plasiyer, teslim cari ara..."
                />
              </label>
              <button
                type="button"
                onClick={resetSelection}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#cdd8e7] bg-white text-[#21304a] shadow-sm transition hover:border-[#1f5eff]"
                aria-label="İrsaliyeleri yenile"
              >
                {dispatchesQuery.isFetching ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              </button>
            </div>
          </div>

          <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
            {dispatchesQuery.isLoading ? (
              <StatePanel icon={<Loader2 className="animate-spin" size={18} />} title="İrsaliyeler yükleniyor" />
            ) : dispatchesQuery.isError ? (
              <StatePanel
                icon={<AlertCircle size={18} />}
                title="İrsaliyeler yüklenemedi"
                description={dispatchesQuery.error instanceof Error ? dispatchesQuery.error.message : 'Netsis read servisi yanıt vermedi.'}
              />
            ) : filteredOrders.length === 0 ? (
              <StatePanel icon={<Search size={18} />} title="Kayıt bulunamadı" description="Arama kriterine uyan irsaliye yok." />
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);
                const lineCount = lineCountByOrderNo.get(order.orderNo);

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => toggleOrder(order)}
                    className={`grid w-full grid-cols-[30px_1fr_auto] gap-3 rounded-lg border p-3 text-left transition ${
                      isSelected ? 'border-[#1f5eff] bg-[#eef5ff] shadow-sm' : 'border-[#dbe4f0] bg-white hover:border-[#8fb4ff]'
                    }`}
                  >
                    <div
                      className={`mt-1 flex h-7 w-7 items-center justify-center rounded-md border ${
                        isSelected ? 'border-[#1f5eff] bg-[#1f5eff] text-white' : 'border-[#cdd8e7] bg-white text-[#708198]'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-[#172033]">{order.orderNo}</span>
                        <span className="rounded-full bg-[#f0f5fb] px-2 py-0.5 text-[10px] font-black text-[#49627e]">
                          {getOrderPrefix(order)}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-bold text-[#42536b]">{order.customer}</div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6b7b91]">
                        <span>{order.date}</span>
                        <span className="text-right">{order.customerCode}</span>
                        <span className="col-span-2 flex items-center gap-1">
                          <Truck size={14} /> {order.route}
                        </span>
                        <span className="flex items-center gap-1">
                          <Warehouse size={14} /> {order.defaultWarehouse}
                        </span>
                        <span className="text-right">{order.shipmentType}</span>
                      </div>
                      <p className="mt-3 rounded-md bg-[#f8fbff] px-2 py-1 text-[11px] font-bold text-[#69809b]">
                        İlk 3 karakteri aynı irsaliyeler birlikte seçilebilir.
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#1f5eff]">
                        {statusLabel[order.status]}
                      </span>
                      <span className="rounded-full bg-[#fff4d8] px-2 py-1 text-[10px] font-black text-[#9a6500]">
                        {lineCount === undefined ? 'Satır' : `${lineCount} satır`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-[#d7e1ef] bg-white shadow-sm">
          <div className="border-b border-[#d7e1ef] bg-[#f8fbff] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#1f5eff]">
                  <PackageCheck size={16} /> Seçili İrsaliye Grubu
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {selectedPrefix} grubu · {selectedOrders.length} irsaliye
                </h2>
                <p className="text-sm font-semibold text-[#6b7b91]">
                  {selectedOrders.length > 0 ? selectedOrders.map((order) => order.orderNo).join(', ') : 'Henüz irsaliye seçilmedi'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryTile label="Satır" value={linesQuery.isFetching ? '...' : String(selectedOrderLines.length)} />
                <SummaryTile label="Seçili" value={String(selectedLines.length)} />
                <SummaryTile label="Kalan" value={numberFormatter.format(selectedQuantity)} />
                <SummaryTile label="İrsaliye" value={String(selectedOrders.length)} />
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <InfoChip icon={<ShieldCheck size={15} />} label="Seçim Kuralı" value={`Prefix: ${selectedPrefix}`} />
              <InfoChip icon={<Warehouse size={15} />} label="Depolar" value={selectedWarehouses.join(', ') || '-'} />
              <InfoChip icon={<Truck size={15} />} label="Sevkiyat" value={selectedShipmentTypes.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="Sorumlu" value={selectedRepresentatives.join(', ') || '-'} />
            </div>

            <div className="mt-3 rounded-lg border border-[#cdd8e7] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#536780]">
                    <SlidersHorizontal size={15} /> Uygulanan İşlem Kuralları
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#172033]">{selectedRuleTitles || 'Kural seçili değil'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasMandatoryShipment ? <RuleBadge tone="warn" label="İrsaliye zorunlu" /> : <RuleBadge tone="info" label="Sevk opsiyonel" />}
                  {hasFixedWarehouse ? <RuleBadge tone="info" label="Depo 100" /> : <RuleBadge tone="success" label="Depo korunur" />}
                  <RuleBadge tone="success" label="Ek alan aktarılır" />
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selectedRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d7e1ef] bg-[#edf3fb] text-left text-xs font-black uppercase tracking-[0.08em] text-[#536780]">
                  <th className="w-14 px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleAllLines}
                      disabled={selectedOrderLines.length === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#cdd8e7] bg-white text-[#1f5eff] disabled:opacity-50"
                      aria-label="Tüm satırları seç"
                    >
                      {selectedOrderLines.length > 0 && selectedOrderLines.every((line) => selectedLineIds.has(line.id)) ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">İrsaliye</th>
                  <th className="px-4 py-3">Stok Kodu</th>
                  <th className="px-4 py-3">Stok Adı</th>
                  <th className="px-4 py-3 text-right">Miktar</th>
                  <th className="px-4 py-3 text-right">Bakiye</th>
                  <th className="px-4 py-3">Depo/Teslim</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Cari Kodu</th>
                </tr>
              </thead>
              <tbody>
                {linesQuery.isFetching ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10">
                      <StatePanel icon={<Loader2 className="animate-spin" size={18} />} title="Kalemler yükleniyor" />
                    </td>
                  </tr>
                ) : linesQuery.isError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10">
                      <StatePanel
                        icon={<AlertCircle size={18} />}
                        title="Kalemler yüklenemedi"
                        description={linesQuery.error instanceof Error ? linesQuery.error.message : 'Netsis read servisi yanıt vermedi.'}
                      />
                    </td>
                  </tr>
                ) : selectedOrderLines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10">
                      <StatePanel icon={<FileText size={18} />} title="Kalem bulunamadı" description="Satırları görmek için irsaliye seçin." />
                    </td>
                  </tr>
                ) : (
                  selectedOrderLines.map((line) => {
                    const isSelected = selectedLineIds.has(line.id);

                    return (
                      <tr
                        key={line.id}
                        className={`border-b border-[#e4ebf4] transition ${isSelected ? 'bg-[#f0f6ff]' : 'bg-white hover:bg-[#fafcff]'}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleLine(line.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                              isSelected ? 'border-[#1f5eff] bg-[#1f5eff] text-white' : 'border-[#cdd8e7] bg-white text-[#5e718b]'
                            }`}
                            aria-label="Satırı seç"
                          >
                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-black text-[#172033]">{line.orderNo}</div>
                          <div className="text-xs font-bold text-[#708198]">{line.shipmentType}</div>
                        </td>
                        <td className="px-4 py-3 font-black text-[#e11d73]">{line.stockCode}</td>
                        <td className="px-4 py-3 font-bold text-[#26344c]">{line.stockName}</td>
                        <td className="px-4 py-3 text-right font-black">
                          {numberFormatter.format(line.quantity)} {line.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#0f9f6e]">
                          {numberFormatter.format(line.remainingQuantity)} {line.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f8] px-2 py-1 text-xs font-black text-[#344765]">
                            <Warehouse size={13} /> {line.warehouse}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#fff4d8] px-2 py-1 text-xs font-black text-[#9a6500]">
                            {lineStatusLabel[line.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#6b7b91]">{line.deliveryNote}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e1ef] bg-[#f8fbff] p-4">
            <div className="text-sm font-bold text-[#52647d]">
              Seçilen irsaliye satırları kural listesine göre seri, KDV, depo ve ek alan bilgileriyle aktarım önizlemesine hazırlanır.
            </div>
            <button
              type="button"
              disabled={selectedLines.length === 0}
              className="rounded-lg bg-[#12325f] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f5eff] disabled:cursor-not-allowed disabled:bg-[#a9b6c8]"
            >
              Seçili Kalemleri Hazırla
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatePanel({ icon, title, description }: { icon: ReactElement; title: string; description?: string }): ReactElement {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-[#cdd8e7] bg-[#f8fbff] p-4 text-center">
      <span className="mb-2 text-[#1f5eff]">{icon}</span>
      <div className="text-sm font-black text-[#172033]">{title}</div>
      {description ? <div className="mt-1 text-xs font-semibold text-[#6b7b91]">{description}</div> : null}
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: ReactElement; label: string; value: string }): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#d7e1ef] bg-white px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eaf2ff] text-[#1f5eff]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#708198]">{label}</span>
        <span className="block truncate text-sm font-black text-[#172033]">{value}</span>
      </span>
    </div>
  );
}

function RuleCard({ rule }: { rule: NdiTransferRule }): ReactElement {
  return (
    <div className="rounded-lg border border-[#dce5f1] bg-[#f8fbff] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-black text-[#172033]">{rule.title}</div>
        <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#1f5eff]">
          {rule.documentType}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-[#536780] sm:grid-cols-2">
        <RuleLine label="Kaynak Seri" value={rule.sourceSerial} />
        <RuleLine label="Hedef" value={`${rule.targetCompany} / ${rule.targetSerial}`} />
        <RuleLine label="Sevk" value={rule.shipmentRule} />
        <RuleLine label="KDV" value={rule.taxRule} />
        <RuleLine label="Depo" value={rule.warehouseRule} />
        <RuleLine label="Not" value={rule.transferNote} />
      </div>
    </div>
  );
}

function RuleLine({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md bg-white px-2 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8797ad]">{label}</div>
      <div className="mt-1 leading-snug text-[#344765]">{value}</div>
    </div>
  );
}

function RuleBadge({ label, tone }: { label: string; tone: 'info' | 'success' | 'warn' }): ReactElement {
  const toneClass = {
    info: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
    success: 'border-[#bbf7d0] bg-[#ecfdf5] text-[#047857]',
    warn: 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]',
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}>{label}</span>;
}

function MetricPill({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8fb4ff]">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="min-w-24 rounded-lg border border-[#d7e1ef] bg-white px-3 py-2 text-right">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#708198]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#172033]">{value}</div>
    </div>
  );
}
