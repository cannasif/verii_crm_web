import { type ReactElement, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  FileText,
  PackageCheck,
  RefreshCw,
  Search,
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
  lines: NdiOrderLine[];
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
    id: 704,
    orderNo: 'SIP2026-000704',
    customer: 'Vega Makina San. ve Tic. A.Ş.',
    date: '03.07.2026',
    currency: 'TL',
    total: 128430,
    status: 'planned',
    route: 'İç sevkiyat / İstanbul',
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
    orderNo: 'SIP2026-000709',
    customer: 'Baygün Hırdavat İnşaat A.Ş.',
    date: '02.07.2026',
    currency: 'TL',
    total: 76250,
    status: 'open',
    route: 'Marmara Bölge',
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

export function NdiOrderTransferDemoPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(demoOrders[0].id);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(
    () => new Set(demoOrders[0].lines.slice(0, 2).map((line) => line.id))
  );

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
        ...order.lines.flatMap((line) => [line.stockCode, line.stockName]),
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => haystack.includes(token));
    });
  }, [search]);

  const selectedOrder = demoOrders.find((order) => order.id === selectedOrderId) ?? demoOrders[0];
  const selectedLines = selectedOrder.lines.filter((line) => selectedLineIds.has(line.id));
  const selectedQuantity = selectedLines.reduce((total, line) => total + line.remainingQuantity, 0);

  const handleSelectOrder = (order: NdiOrder) => {
    setSelectedOrderId(order.id);
    setSelectedLineIds(new Set());
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
      if (current.size === selectedOrder.lines.length) {
        return new Set();
      }

      return new Set(selectedOrder.lines.map((line) => line.id));
    });
  };

  const resetDemo = () => {
    setSearch('');
    setSelectedOrderId(demoOrders[0].id);
    setSelectedLineIds(new Set(demoOrders[0].lines.slice(0, 2).map((line) => line.id)));
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <div className="border-b border-[#d9e2ef] bg-[#0f1b2e] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#8fb4ff]">NDI</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Sipariş Kalem Seçim Konsolu</h1>
            <p className="mt-1 text-sm font-semibold text-[#b8c7dd]">
              Demo veri ile sipariş ve satır seçim akışı. FN geldiğinde bu liste canlı veriye bağlanacak.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricPill label="Sipariş" value={selectedOrder.orderNo} />
            <MetricPill label="Seçili Kalem" value={String(selectedLines.length)} />
            <MetricPill label="Miktar" value={numberFormatter.format(selectedQuantity)} />
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1540px] gap-4 px-6 py-5 xl:grid-cols-[390px_1fr]">
        <section className="rounded-lg border border-[#d7e1ef] bg-white shadow-sm">
          <div className="border-b border-[#d7e1ef] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1f5eff]">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-black">Siparişler</h2>
                <p className="text-xs font-semibold text-[#6b7b91]">Sipariş, müşteri veya stok içinde ara.</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#cdd8e7] bg-[#f8fbff] px-3 py-2 focus-within:border-[#1f5eff]">
                <Search size={18} className="text-[#51709a]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#8fa1b8]"
                  placeholder="Sipariş, müşteri, stok ara..."
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
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => handleSelectOrder(order)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  order.id === selectedOrder.id
                    ? 'border-[#1f5eff] bg-[#eef5ff] shadow-sm'
                    : 'border-[#dbe4f0] bg-white hover:border-[#8fb4ff]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-[#172033]">{order.orderNo}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-bold text-[#42536b]">{order.customer}</div>
                  </div>
                  <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#1f5eff]">
                    {statusLabel[order.status]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6b7b91]">
                  <span>{order.date}</span>
                  <span className="text-right">
                    {moneyFormatter.format(order.total)} {order.currency}
                  </span>
                  <span className="col-span-2 flex items-center gap-1">
                    <Truck size={14} /> {order.route}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-[#d7e1ef] bg-white shadow-sm">
          <div className="border-b border-[#d7e1ef] bg-[#f8fbff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#1f5eff]">
                  <PackageCheck size={16} /> Seçili Sipariş
                </div>
                <h2 className="mt-1 text-xl font-black">{selectedOrder.orderNo}</h2>
                <p className="text-sm font-semibold text-[#6b7b91]">{selectedOrder.customer}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryTile label="Satır" value={String(selectedOrder.lines.length)} />
                <SummaryTile label="Seçili" value={String(selectedLines.length)} />
                <SummaryTile label="Kalan" value={numberFormatter.format(selectedQuantity)} />
                <SummaryTile label="Kur" value={selectedOrder.currency} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d7e1ef] bg-[#edf3fb] text-left text-xs font-black uppercase tracking-[0.08em] text-[#536780]">
                  <th className="w-14 px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleAllLines}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#cdd8e7] bg-white text-[#1f5eff]"
                      aria-label="Tüm satırları seç"
                    >
                      {selectedLineIds.size === selectedOrder.lines.length ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </th>
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
                {selectedOrder.lines.map((line) => {
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
              Seçili kalemler demo olarak hazırlanır. Canlı FN geldiğinde burada NDI aktarım payload önizlemesi gösterilecek.
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
