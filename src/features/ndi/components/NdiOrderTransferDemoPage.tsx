import { type ReactElement, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  FileText,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Warehouse,
} from 'lucide-react';

interface NdiOrderLine {
  id: number;
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
  id: number;
  orderNo: string;
  customer: string;
  date: string;
  currency: string;
  total: number;
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
  lines: NdiOrderLine[];
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

const demoOrders: NdiOrder[] = [
  {
    id: 701,
    orderNo: 'SIP2026-000701',
    customer: 'Hendel Ltd. - Bulgaristan',
    date: '03.07.2026',
    currency: 'EUR',
    total: 47902.1,
    status: 'partial',
    route: 'Yurt dışı / Bulgaristan',
    branch: 'Merkez',
    shipmentType: 'İhracat',
    defaultWarehouse: 'NDI-01',
    representative: 'Rümeysa Kara',
    operationProfile: 'disTicaret',
    documentType: 'irsaliye',
    hasShipment: true,
    lines: [
      {
        id: 70101,
        stockCode: '31213391215042',
        stockName: 'KAPI KOLU AL BELGRAD 85 E UZUN KARE 8019 MAT',
        quantity: 240,
        remainingQuantity: 180,
        unit: 'AD',
        warehouse: 'NDI-01',
        deliveryNote: 'Paletli sevk',
        status: 'partial',
      },
      {
        id: 70102,
        stockCode: '31213391415041',
        stockName: 'KAPI KOLU AL BELGRAD WC UZUN KARE 8003 MAT',
        quantity: 120,
        remainingQuantity: 120,
        unit: 'AD',
        warehouse: 'NDI-01',
        deliveryNote: 'Tek koli',
        status: 'ready',
      },
      {
        id: 70103,
        stockCode: '31323382733J14',
        stockName: 'PEN.KOLU ABS ATLAS AKUSTIK KARE 9016',
        quantity: 300,
        remainingQuantity: 90,
        unit: 'AD',
        warehouse: 'NDI-02',
        deliveryNote: 'İhracat koli etiketi',
        status: 'partial',
      },
    ],
  },
  {
    id: 702,
    orderNo: 'SIP2026-000702',
    customer: 'Hendel Ltd. - Bulgaristan',
    date: '03.07.2026',
    currency: 'EUR',
    total: 32140.25,
    status: 'open',
    route: 'Yurt dışı / Bulgaristan',
    branch: 'Merkez',
    shipmentType: 'İhracat',
    defaultWarehouse: 'NDI-02',
    representative: 'Rümeysa Kara',
    operationProfile: 'disTicaret',
    documentType: 'irsaliye',
    hasShipment: true,
    lines: [
      {
        id: 70201,
        stockCode: '312133912B2011',
        stockName: 'KAPI KOLU AL BELGRAD 85 E UZUN OVAL 9005 MAT',
        quantity: 180,
        remainingQuantity: 180,
        unit: 'AD',
        warehouse: 'NDI-02',
        deliveryNote: 'Aynı konşimento',
        status: 'ready',
      },
      {
        id: 70202,
        stockCode: '31323382733U03',
        stockName: 'PEN.KOLU ABS ATLAS AKUSTIK KARE 7016',
        quantity: 220,
        remainingQuantity: 110,
        unit: 'AD',
        warehouse: 'NDI-01',
        deliveryNote: 'Kısmi sevk',
        status: 'partial',
      },
    ],
  },
  {
    id: 704,
    orderNo: 'SIP2026-000704',
    customer: 'Vega Makina San. ve Tic. A.Ş.',
    date: '03.07.2026',
    currency: 'TL',
    total: 128430,
    status: 'planned',
    route: 'İç sevkiyat / İstanbul',
    branch: 'İstanbul',
    shipmentType: 'Yurt içi sevk',
    defaultWarehouse: 'MERKEZ',
    representative: 'Can Nasif',
    operationProfile: 'windoformKapi',
    documentType: 'fatura',
    hasShipment: false,
    specialCode: 'N',
    lines: [
      {
        id: 70401,
        stockCode: 'CRM_PERF_0003400000',
        stockName: 'KAPI KOLU BAĞLANTI 0003400000',
        quantity: 80,
        remainingQuantity: 80,
        unit: 'TK',
        warehouse: 'MERKEZ',
        deliveryNote: 'Aynı gün sevk',
        status: 'ready',
      },
      {
        id: 70402,
        stockCode: 'CRM_PERF_0003399998',
        stockName: 'AKUSTIK OVAL PANEL 0003399998',
        quantity: 48,
        remainingQuantity: 48,
        unit: 'MT',
        warehouse: 'MERKEZ',
        deliveryNote: 'Hasarsız paket',
        status: 'ready',
      },
    ],
  },
  {
    id: 709,
    orderNo: 'NDI2026-000709',
    customer: 'Baygün Hırdavat İnşaat A.Ş.',
    date: '02.07.2026',
    currency: 'TL',
    total: 76250,
    status: 'open',
    route: 'Marmara Bölge',
    branch: 'Bursa',
    shipmentType: 'Bölge sevk',
    defaultWarehouse: 'NDI-03',
    representative: 'Ömer V3rii',
    operationProfile: 'nuray',
    documentType: 'irsaliye',
    hasShipment: true,
    lines: [
      {
        id: 70901,
        stockCode: '150-02-101-009-4015',
        stockName: 'IS AYAKKABISI',
        quantity: 36,
        remainingQuantity: 36,
        unit: 'AD',
        warehouse: 'NDI-03',
        deliveryNote: 'Kontrol sonrası',
        status: 'waiting',
      },
      {
        id: 70902,
        stockCode: '150-02-103-004-2581',
        stockName: 'DIS SAHA MONTU',
        quantity: 24,
        remainingQuantity: 24,
        unit: 'AD',
        warehouse: 'NDI-03',
        deliveryNote: 'Beden ayrımı yapılacak',
        status: 'waiting',
      },
    ],
  },
];

const moneyFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

function getOrderPrefix(order: NdiOrder): string {
  return order.orderNo.slice(0, 3).toLocaleUpperCase('tr-TR');
}

function getRule(order: NdiOrder): NdiTransferRule {
  return transferRules.find((rule) => rule.id === order.operationProfile) ?? transferRules[0];
}

export function NdiOrderTransferDemoPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(() => new Set([701, 702]));
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(() => new Set([70101, 70102, 70201]));

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');

    if (!normalizedSearch) {
      return demoOrders;
    }

    return demoOrders.filter((order) => {
      const haystack = [
        order.orderNo,
        order.customer,
        order.route,
        order.branch,
        order.shipmentType,
        order.defaultWarehouse,
        order.representative,
        ...order.lines.flatMap((line) => [line.stockCode, line.stockName, line.warehouse, line.deliveryNote]),
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => haystack.includes(token));
    });
  }, [search]);

  const selectedOrders = demoOrders.filter((order) => selectedOrderIds.has(order.id));
  const selectedPrefix = selectedOrders[0] ? getOrderPrefix(selectedOrders[0]) : getOrderPrefix(demoOrders[0]);
  const selectedOrderLines = selectedOrders.flatMap((order) =>
    order.lines.map((line) => ({
      ...line,
      orderNo: order.orderNo,
      customer: order.customer,
      route: order.route,
      shipmentType: order.shipmentType,
    }))
  );
  const selectedLines = selectedOrderLines.filter((line) => selectedLineIds.has(line.id));
  const selectedQuantity = selectedLines.reduce((total, line) => total + line.remainingQuantity, 0);
  const selectedTotal = selectedOrders.reduce((total, order) => total + order.total, 0);
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
      const currentOrders = demoOrders.filter((item) => current.has(item.id));
      const currentPrefix = currentOrders[0] ? getOrderPrefix(currentOrders[0]) : getOrderPrefix(order);
      const orderPrefix = getOrderPrefix(order);
      const next = orderPrefix === currentPrefix ? new Set(current) : new Set<number>();

      if (next.has(order.id)) {
        next.delete(order.id);
      } else {
        next.add(order.id);
      }

      const resolved = next.size > 0 ? next : new Set([order.id]);
      const allowedLineIds = new Set(
        demoOrders.filter((item) => resolved.has(item.id)).flatMap((item) => item.lines.map((line) => line.id))
      );

      setSelectedLineIds((currentLines) => new Set([...currentLines].filter((lineId) => allowedLineIds.has(lineId))));
      return resolved;
    });
  };

  const toggleLine = (lineId: number) => {
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

  const resetDemo = () => {
    setSearch('');
    setSelectedOrderIds(new Set([701, 702]));
    setSelectedLineIds(new Set([70101, 70102, 70201]));
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <div className="border-b border-[#d9e2ef] bg-[#0f1b2e] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#8fb4ff]">NDI</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Sipariş Kalem Seçim Konsolu</h1>
            <p className="mt-1 text-sm font-semibold text-[#b8c7dd]">
              İlk 3 karakteri aynı siparişler birlikte seçilir; depo, sevkiyat ve satır bilgileri aktarım için hazırlanır.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricPill label="Grup" value={`${selectedPrefix} / ${selectedOrders.length} sipariş`} />
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
                <h2 className="text-base font-black">Siparişler</h2>
                <p className="text-xs font-semibold text-[#6b7b91]">Aynı prefix grubundan birden fazla sipariş seçin.</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#cdd8e7] bg-[#f8fbff] px-3 py-2 focus-within:border-[#1f5eff]">
                <Search size={18} className="text-[#51709a]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#8fa1b8]"
                  placeholder="Sipariş, müşteri, stok, depo ara..."
                />
              </label>
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#cdd8e7] bg-white text-[#21304a] shadow-sm transition hover:border-[#1f5eff]"
                aria-label="Demo veriyi yenile"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </div>

          <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
            {filteredOrders.map((order) => {
              const isSelected = selectedOrderIds.has(order.id);

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
                      <span className="text-right">
                        {moneyFormatter.format(order.total)} {order.currency}
                      </span>
                      <span className="col-span-2 flex items-center gap-1">
                        <Truck size={14} /> {order.route}
                      </span>
                      <span className="flex items-center gap-1">
                        <Warehouse size={14} /> {order.defaultWarehouse}
                      </span>
                      <span className="text-right">{order.shipmentType}</span>
                    </div>
                    <p className="mt-3 rounded-md bg-[#f8fbff] px-2 py-1 text-[11px] font-bold text-[#69809b]">
                      İlk 3 karakteri aynı siparişler birlikte seçilebilir.
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#1f5eff]">
                      {statusLabel[order.status]}
                    </span>
                    <span className="rounded-full bg-[#fff4d8] px-2 py-1 text-[10px] font-black text-[#9a6500]">
                      {order.lines.length} satır
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-[#d7e1ef] bg-white shadow-sm">
          <div className="border-b border-[#d7e1ef] bg-[#f8fbff] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#1f5eff]">
                  <PackageCheck size={16} /> Seçili Sipariş Grubu
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {selectedPrefix} grubu · {selectedOrders.length} sipariş
                </h2>
                <p className="text-sm font-semibold text-[#6b7b91]">
                  {selectedOrders.map((order) => order.orderNo).join(', ')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryTile label="Satır" value={String(selectedOrderLines.length)} />
                <SummaryTile label="Seçili" value={String(selectedLines.length)} />
                <SummaryTile label="Kalan" value={numberFormatter.format(selectedQuantity)} />
                <SummaryTile label="Toplam" value={moneyFormatter.format(selectedTotal)} />
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
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#cdd8e7] bg-white text-[#1f5eff]"
                      aria-label="Tüm satırları seç"
                    >
                      {selectedOrderLines.length > 0 && selectedOrderLines.every((line) => selectedLineIds.has(line.id)) ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Sipariş</th>
                  <th className="px-4 py-3">Stok Kodu</th>
                  <th className="px-4 py-3">Stok Adı</th>
                  <th className="px-4 py-3 text-right">Miktar</th>
                  <th className="px-4 py-3 text-right">Kalan</th>
                  <th className="px-4 py-3">Depo</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Not</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderLines.map((line) => {
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
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e1ef] bg-[#f8fbff] p-4">
            <div className="text-sm font-bold text-[#52647d]">
              Aynı ilk 3 karakterli siparişlerden seçilen satırlar kural listesine göre seri, KDV, depo ve ek alan bilgileriyle aktarım önizlemesine hazırlanır.
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
