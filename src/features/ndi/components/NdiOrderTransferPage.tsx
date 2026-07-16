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

import {
  ndiApi,
  type NdiTransferCreateResponseDto,
  type NetsisCustomerDispatchDto,
  type NetsisCustomerDispatchLineDto,
} from '../api/ndi-api';

interface NdiOrderLine {
  id: string;
  orderNo: string;
  customer: string;
  route: string;
  shipmentType: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  unitPrice: number;
  foreignUnitPrice?: number | null;
  currencyType?: number | null;
  currencyRate?: number | null;
  exchangeRate?: number | null;
  remainingQuantity: number;
  unit: string;
  warehouse: string;
  deliveryNote: string;
  status: 'ready' | 'partial' | 'waiting';
}

interface NdiPreparedLine {
  id: string;
  orderNo: string;
  stockCode: string;
  stockName: string;
  sourceQuantity: number;
  transferQuantity: number;
  unitPrice: number;
  foreignUnitPrice?: number | null;
  currencyType?: number | null;
  currencyRate?: number | null;
  exchangeRate?: number | null;
  unit: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  targetVat: number | null;
}

interface NdiPreparedDocument {
  sourceDocumentNo: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSeries: string;
  documentType: 'İrsaliye' | 'Fatura';
  followUpNote?: string;
  customerCode: string;
  customerName: string;
  description: string;
  date: string | null;
  lineCount: number;
}

interface NdiPreparedTransfer {
  actionLabel: string;
  sourceNetsisCompanies: string[];
  targetNetsisCompanies: string[];
  documentNos: string[];
  createdDocuments: NdiPreparedDocument[];
  lineCount: number;
  totalSourceQuantity: number;
  totalTransferQuantity: number;
  lines: NdiPreparedLine[];
  warnings: string[];
}

interface NdiOrder {
  id: string;
  orderNo: string;
  customer: string;
  customerCode: string;
  date: string;
  documentDate: string | null;
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
  description: string;
  tip: string;
  exportType: string;
}

interface NdiTransferRule {
  id: NdiOrder['operationProfile'];
  title: string;
  documentType: NdiOrder['documentType'];
  sourceSerial: string;
  sourceNetsisCompany: string;
  targetCompany: string;
  targetNetsisCompany: string;
  targetSerial: string;
  shipmentRule: string;
  taxRule: string;
  warehouseRule: string;
  transferNote: string;
  officialNote: string;
  bulkNote: string;
}

type NdiBusinessSeries = 'NUR' | 'VIN' | 'DIS' | 'SIP';
type NdiBatchAction = 'IRSALIYELISTIR' | 'FATURALASTIR';

interface NdiSeriesConfig {
  label: string;
  netsisCompany: string;
  eFatura?: string;
  eArsiv?: string;
  fatura?: string;
}

interface NdiWarehouseOption {
  code: string;
  label: string;
  tipLabel: string;
}

interface NdiWarehouseConfig {
  label: string;
  default: string;
  editable: boolean;
  warehouses: NdiWarehouseOption[];
}

interface NdiRuleOutcome {
  orderId: string;
  orderNo: string;
  series: NdiBusinessSeries;
  sourcePrefix: string;
  action: NdiBatchAction;
  actionLabel: string;
  companyLabel: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSeries: string;
  seriesNote: string;
  targetWarehouse: string;
  targetWarehouseLabel: string;
  targetWarehouseLocked: boolean;
  sourceVat: number | null;
  targetVat: number | null;
  vatNote: string;
  quantityRuleLabel: string;
  requestedQuantity: number;
  transferQuantity: number;
  quantityNote: string;
  systemNotes: string[];
  userNotes: string[];
  warnings: string[];
  blocks: string[];
  canProceed: boolean;
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
    sourceNetsisCompany: 'SIRKET24',
    targetCompany: 'NURAY',
    targetNetsisCompany: 'NURAY24',
    targetSerial: 'Kaynak irsaliye/fatura serisi',
    shipmentRule: 'Cari sevk var ise irsaliye aktarımı zorunlu, yok ise zorunlu değil.',
    taxRule: '1/4 siparişlerde kalem miktarının 1/4 adedi ve KDV %5; TAM siparişlerde miktarın tamamı ve KDV %20 ile NURAY24 şirketine aktarılır.',
    warehouseRule: 'Kaynak depo korunur.',
    transferNote: 'İrsaliye NURAY24 şirketine oluşturulur; fatura işlemi ayrıca çalıştırılır.',
    officialNote: 'SIRKET24 tarafına yeni kayıt veya fatura oluşturulmaz.',
    bulkNote: 'Aynı ilk 3 karakter grubundaki NUR belgeleri toplu seçilebilir.',
  },
  {
    id: 'windoformKapi',
    title: 'WINDOFORM KAPI',
    documentType: 'irsaliye',
    sourceSerial: 'VIN',
    sourceNetsisCompany: 'SIRKET24',
    targetCompany: 'WINDO',
    targetNetsisCompany: 'WIN24',
    targetSerial: 'Kaynak irsaliye/fatura serisi',
    shipmentRule: 'Cari sevk var ise irsaliye zorunlu; özel kod K ise irsaliye zorunlu.',
    taxRule: 'Özel Kod K ihraç kayıtlı KDV 0, Özel Kod N normal satış KDV %20.',
    warehouseRule: 'Kaynak depo korunur.',
    transferNote: 'İrsaliye WIN24 şirketine oluşturulur; fatura işlemi ayrıca çalıştırılır.',
    officialNote: 'SIRKET24 tarafına yeni kayıt veya fatura oluşturulmaz.',
    bulkNote: 'Aynı ilk 3 karakter grubundaki VIN belgeleri toplu seçilebilir.',
  },
  {
    id: 'disTicaret',
    title: 'DIŞ TİCARET',
    documentType: 'irsaliye',
    sourceSerial: 'DIS',
    sourceNetsisCompany: 'SIRKET24',
    targetCompany: 'WIN DIS',
    targetNetsisCompany: 'DISTIC24',
    targetSerial: 'EIR',
    shipmentRule: 'Sevk durumuna bakılmadan aktarım yapılabilir.',
    taxRule: 'KDV 0; gün döviz kuru alınır.',
    warehouseRule: 'Varsayılan depo kodu 100 olmalı.',
    transferNote: 'Fatura serisi de irsaliye serisi de EIR olmalıdır.',
    officialNote: 'Dış ticaret aktarımında resmi belge EIR seri kuralıyla hazırlanır.',
    bulkNote: 'İrsaliye birleştirme ve toplu aktarım desteklenebilir.',
  },
  {
    id: 'sirket24',
    title: 'ŞİRKET24 Fatura',
    documentType: 'fatura',
    sourceSerial: 'SIP',
    sourceNetsisCompany: 'SIRKET24',
    targetCompany: 'ŞİRKET24',
    targetNetsisCompany: 'SIRKET24',
    targetSerial: 'SIP2026',
    shipmentRule: 'Sevk var/yok fark etmez.',
    taxRule: 'KDV 0; resmi evrak oluşmayacak.',
    warehouseRule: 'Depo kuralı yok.',
    transferNote: 'Sadece ŞİRKET24 faturası oluşur; fatura seri numarası SIP2026 olmalıdır.',
    officialNote: 'Resmi evrak oluşmayacak.',
    bulkNote: 'Aynı ilk 3 karakter grubundaki SIP belgeleri toplu seçilebilir.',
  },
];

const SERIES_CONFIG: Record<NdiBusinessSeries, NdiSeriesConfig> = {
  NUR: { label: 'NURAY', netsisCompany: 'NURAY24', eFatura: 'NRY', eArsiv: 'NEA' },
  VIN: { label: 'WINDOFORM KAPI', netsisCompany: 'WIN24', eFatura: 'VDF', eArsiv: 'EAR' },
  DIS: { label: 'DIŞ TİCARET', netsisCompany: 'DISTIC24', eFatura: 'EIR', eArsiv: 'EIR' },
  SIP: { label: 'ŞİRKET24', netsisCompany: 'SIRKET24', fatura: 'SIP2026' },
};

const COMPANY_WAREHOUSE_CONFIG: Record<NdiTransferRule['id'], NdiWarehouseConfig> = {
  nuray: {
    label: 'NURAY',
    default: '100',
    editable: true,
    warehouses: [
      { code: '100', label: 'Ana Depo', tipLabel: 'Varsayılan' },
      { code: '101', label: 'Proje Deposu', tipLabel: 'NURAY' },
      { code: '102', label: 'Sevk Deposu', tipLabel: 'NURAY' },
    ],
  },
  windoformKapi: {
    label: 'WINDOFORM',
    default: '100',
    editable: true,
    warehouses: [
      { code: '100', label: 'Ana Depo', tipLabel: 'Varsayılan' },
      { code: '110', label: 'Üretim Deposu', tipLabel: 'VIN' },
      { code: '111', label: 'Sevk Deposu', tipLabel: 'VIN' },
    ],
  },
  disTicaret: {
    label: 'DIŞ TİCARET',
    default: '100',
    editable: false,
    warehouses: [{ code: '100', label: 'Dış Ticaret Deposu', tipLabel: 'Sabit kural' }],
  },
  sirket24: {
    label: 'ŞİRKET24',
    default: '100',
    editable: true,
    warehouses: [
      { code: '100', label: 'Ana Depo', tipLabel: 'Varsayılan' },
      { code: '200', label: 'Merkez Depo', tipLabel: 'SIP' },
    ],
  },
};

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

const NDI_TABLE_CELL = 'border-r border-slate-300 px-4 py-3 dark:border-white/20 last:border-r-0';

function getOrderPrefix(order: NdiOrder): string {
  return order.orderNo.slice(0, 3).toLocaleUpperCase('tr-TR');
}

function getKnownSeries(value: string): NdiBusinessSeries | null {
  const prefix = value.slice(0, 3).toLocaleUpperCase('tr-TR');
  return prefix === 'NUR' || prefix === 'VIN' || prefix === 'DIS' || prefix === 'SIP' ? prefix : null;
}

function resolveSourceDocumentSeries(value: string): string {
  const normalized = value.trim();
  const beforeDash = normalized.split('-').filter(Boolean)[0] ?? normalized;
  const match = beforeDash.match(/^[A-Za-zÇĞİÖŞÜçğıöşü]+/);
  return (match?.[0] || beforeDash.slice(0, 3)).toLocaleUpperCase('tr-TR');
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
  const series = getKnownSeries(dispatch.irsaliyeNo);
  if (series === 'NUR') {
    return 'nuray';
  }
  if (series === 'VIN') {
    return 'windoformKapi';
  }
  if (series === 'DIS') {
    return 'disTicaret';
  }
  if (series === 'SIP') {
    return 'sirket24';
  }

  const type = normalizeText(dispatch.tipi);
  const exportType = normalizeText(dispatch.exportTipi);

  if (type.includes('dışı') || (exportType && exportType !== '-')) {
    return 'disTicaret';
  }

  return 'windoformKapi';
}

function getBusinessSeries(order: NdiOrder): NdiBusinessSeries {
  const knownSeries = getKnownSeries(order.orderNo);
  if (knownSeries) {
    return knownSeries;
  }

  if (order.operationProfile === 'nuray') {
    return 'NUR';
  }
  if (order.operationProfile === 'disTicaret') {
    return 'DIS';
  }
  if (order.operationProfile === 'sirket24') {
    return 'SIP';
  }

  return 'VIN';
}

function getActionLabel(action: NdiBatchAction): string {
  return action === 'IRSALIYELISTIR' ? 'İrsaliyeleştir' : 'Faturalaştır';
}

function resolvePrimaryAction(order: NdiOrder): NdiBatchAction {
  const series = getBusinessSeries(order);
  if (series === 'SIP' || order.documentType === 'fatura') {
    return 'FATURALASTIR';
  }

  return 'IRSALIYELISTIR';
}

function resolveBatchAction(orders: NdiOrder[]): { action: NdiBatchAction | null; mixed: boolean; hint: string } {
  if (orders.length === 0) {
    return { action: null, mixed: false, hint: 'Belge seçin' };
  }

  const actions = orders.map(resolvePrimaryAction);
  const allDispatch = actions.every((action) => action === 'IRSALIYELISTIR');
  const allInvoice = actions.every((action) => action === 'FATURALASTIR');

  if (allDispatch) {
    return { action: 'IRSALIYELISTIR', mixed: false, hint: 'İrsaliye senaryosu' };
  }
  if (allInvoice) {
    return { action: 'FATURALASTIR', mixed: false, hint: 'Fatura senaryosu' };
  }

  return { action: null, mixed: true, hint: 'Karışık irsaliye/fatura seçimi' };
}

function resolveTargetSeries(order: NdiOrder): { value: string; note: string; warning?: string } {
  const series = getBusinessSeries(order);
  const action = resolvePrimaryAction(order);
  const config = SERIES_CONFIG[series];

  if (series === 'DIS') {
    return { value: 'EIR', note: 'Dış ticaret kayıtlarında fatura ve irsaliye sabit EIR serisiyle hazırlanır.' };
  }
  if (series === 'SIP') {
    return {
      value: config.fatura ?? 'SIP2026',
      note: 'Şirket24 fatura akışı sabit SIP2026 serisiyle hazırlanır; resmi evrak oluşturulmaz.',
    };
  }

  if (action === 'IRSALIYELISTIR') {
    const sourceDocumentSeries = resolveSourceDocumentSeries(order.orderNo);
    return {
      value: sourceDocumentSeries,
      note: `${config.label}: irsaliye aktarımında kaynakta kullanılan ${sourceDocumentSeries} serisi ${config.netsisCompany} şirketine taşınır.`,
    };
  }

  const defaultSeries = config.eFatura ?? '-';
  return {
    value: defaultSeries,
    note: `${config.label}: cari e-Belge tipine göre e-Fatura ${config.eFatura}, e-Arşiv ${config.eArsiv} serisi kullanılır.`,
    warning: 'Bu read fonksiyonu cari e-Belge tipini dönmediği için hedef seri entegrasyon sırasında cari kartından kesinleştirilmelidir.',
  };
}

function resolveWarehouse(order: NdiOrder): { value: string; label: string; locked: boolean; note: string } {
  const warehouseConfig = COMPANY_WAREHOUSE_CONFIG[order.operationProfile];
  const option = warehouseConfig.warehouses.find((item) => item.code === warehouseConfig.default) ?? warehouseConfig.warehouses[0];
  const locked = !warehouseConfig.editable || getBusinessSeries(order) === 'DIS';

  return {
    value: option?.code ?? '100',
    label: option ? `${option.code} - ${option.label}` : '100',
    locked,
    note: locked
      ? `${warehouseConfig.label} için hedef depo ${warehouseConfig.default} sabit kuraldır.`
      : `${warehouseConfig.label} için varsayılan depo ${warehouseConfig.default}; aktarımda değiştirilebilir.`,
  };
}

function resolveVat(order: NdiOrder): { sourceVat: number | null; targetVat: number | null; note: string; block?: string } {
  const series = getBusinessSeries(order);
  const description = normalizeText(order.description);

  if (series === 'DIS' || series === 'SIP') {
    return { sourceVat: 0, targetVat: 0, note: 'Dış ticaret/Şirket24 kuralında hedef KDV %0.' };
  }

  if (series === 'NUR') {
    if (description.includes('1/4')) {
      return { sourceVat: 20, targetVat: 5, note: 'Açıklamada 1/4 geçtiği için NURAY24 hedefinde KDV %5 uygulanır.' };
    }
    return { sourceVat: 20, targetVat: 20, note: 'TAM satış kabulüyle kaynak ve hedef KDV %20.' };
  }

  if (series === 'VIN') {
    if (order.specialCode === 'K') {
      return { sourceVat: 20, targetVat: 0, note: 'Özel Kod K ihraç kayıtlı kabul edilir; hedef KDV %0.' };
    }
    if (order.specialCode === 'N') {
      return { sourceVat: 20, targetVat: 20, note: 'Özel Kod N normal satış kabul edilir; hedef KDV %20.' };
    }
    return { sourceVat: 20, targetVat: null, note: 'KDV için Özel Kod 1 gerekli.', block: 'WINDOFORM için Özel Kod 1 K veya N olmalı.' };
  }

  return { sourceVat: null, targetVat: null, note: 'KDV kuralı belirlenemedi.', block: 'Seri tanımsız olduğu için KDV kuralı uygulanamadı.' };
}

function resolveQuantityRule(order: NdiOrder, lines: NdiOrderLine[]): { label: string; requestedQuantity: number; transferQuantity: number; note: string; block?: string } {
  const series = getBusinessSeries(order);
  const description = normalizeText(order.description);
  const requestedQuantity = lines.reduce((total, line) => total + Math.max(line.remainingQuantity, 0), 0);

  if (series !== 'NUR') {
    return {
      label: 'Tam',
      requestedQuantity,
      transferQuantity: requestedQuantity,
      note: 'Bu akışta seçilen satırların kalan miktarının tamamı aktarılır.',
    };
  }

  if (description.includes('1/4')) {
    const transferQuantity = requestedQuantity / 4;

    return {
      label: '1/4',
      requestedQuantity,
      transferQuantity,
      note: `1/4 kuralı: seçilen ${numberFormatter.format(requestedQuantity)} adet kalan miktarın ${numberFormatter.format(transferQuantity)} adedi aktarılır.`,
    };
  }

  if (description.includes('tam')) {
    return {
      label: 'TAM',
      requestedQuantity,
      transferQuantity: requestedQuantity,
      note: `TAM kuralı: seçilen ${numberFormatter.format(requestedQuantity)} adet kalan miktarın tamamı aktarılır.`,
    };
  }

  return {
    label: 'Belirsiz',
    requestedQuantity,
    transferQuantity: requestedQuantity,
    note: 'NURAY akışında miktar kuralı için açıklamada 1/4 veya TAM bilgisi bulunmalıdır.',
    block: 'NURAY akışında aktarılacak miktar için açıklamada 1/4 veya TAM bilgisi zorunludur.',
  };
}

function buildRuleOutcome(order: NdiOrder, lines: NdiOrderLine[]): NdiRuleOutcome {
  const series = getBusinessSeries(order);
  const sourcePrefix = getOrderPrefix(order);
  const action = resolvePrimaryAction(order);
  const rule = getRule(order);
  const targetSeries = resolveTargetSeries(order);
  const warehouse = resolveWarehouse(order);
  const vat = resolveVat(order);
  const quantityRule = resolveQuantityRule(order, lines);
  const zeroBalanceCount = lines.filter((line) => line.quantity > 0 && line.remainingQuantity <= 0).length;
  const warnings: string[] = [];
  const blocks: string[] = [];
  const systemNotes: string[] = [
    targetSeries.note,
    warehouse.note,
    quantityRule.note,
    vat.note,
    rule.officialNote,
    rule.bulkNote,
    'Ek alan 1 ve satır bilgileri aktarım payloadında korunmalıdır.',
  ];
  const userNotes: string[] = [];

  if (targetSeries.warning) {
    warnings.push(targetSeries.warning);
  }
  if (zeroBalanceCount > 0) {
    warnings.push(`${zeroBalanceCount} satırda bakiye 0 görünüyor; aktarım öncesi satır seçimi kontrol edilmeli.`);
  }
  if (vat.block) {
    blocks.push(vat.block);
  }
  if (quantityRule.block) {
    blocks.push(quantityRule.block);
  }
  if (series === 'NUR' && !order.description.trim()) {
    blocks.push('NURAY akışında 1/4 veya TAM ayrımı için irsaliye açıklaması boş olmamalı.');
  }
  if (series === 'VIN' && order.specialCode === 'K' && action !== 'IRSALIYELISTIR') {
    blocks.push('WINDOFORM Özel Kod K ihraç kayıtlı işlemde irsaliye zorunludur; fatura akışı tek başına hazırlanmamalıdır.');
  }
  if (series === 'VIN' && order.specialCode === 'K') {
    userNotes.push('İhraç kayıtlı işlem: irsaliye zorunlu ve hedef KDV %0 olmalı.');
  }
  if (series === 'NUR' && order.description.trim()) {
    userNotes.push(quantityRule.label === '1/4' ? '1/4 açıklaması algılandı: miktar 1/4, hedef KDV %5.' : 'TAM satış açıklaması algılandı: miktar tam, hedef KDV %20.');
  }
  if (sourcePrefix !== series) {
    warnings.push(`Belge prefix ${sourcePrefix}; iş kuralı ${series} olarak yorumlandı.`);
  }

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    series,
    sourcePrefix,
    action,
    actionLabel: getActionLabel(action),
    companyLabel: SERIES_CONFIG[series].label,
    sourceNetsisCompany: rule.sourceNetsisCompany,
    targetNetsisCompany: rule.targetNetsisCompany,
    targetSeries: targetSeries.value,
    seriesNote: targetSeries.note,
    targetWarehouse: warehouse.value,
    targetWarehouseLabel: warehouse.label,
    targetWarehouseLocked: warehouse.locked,
    sourceVat: vat.sourceVat,
    targetVat: vat.targetVat,
    vatNote: vat.note,
    quantityRuleLabel: quantityRule.label,
    requestedQuantity: quantityRule.requestedQuantity,
    transferQuantity: quantityRule.transferQuantity,
    quantityNote: quantityRule.note,
    systemNotes,
    userNotes,
    warnings,
    blocks,
    canProceed: blocks.length === 0,
  };
}

function mapDispatchToOrder(dispatch: NetsisCustomerDispatchDto): NdiOrder {
  const operationProfile = resolveOperationProfile(dispatch);
  const shipmentType = dispatch.exportTipi && dispatch.exportTipi !== '-' ? dispatch.exportTipi : dispatch.tipi || 'İrsaliye';
  const exportType = dispatch.exportTipi || '-';

  return {
    id: dispatch.irsaliyeNo,
    orderNo: dispatch.irsaliyeNo,
    customer: dispatch.cariIsim || dispatch.cariKodu,
    customerCode: dispatch.cariKodu,
    date: formatDate(dispatch.tarih),
    documentDate: dispatch.tarih ?? null,
    status: operationProfile === 'disTicaret' ? 'partial' : 'open',
    route: [dispatch.tipi, dispatch.teslimCariIsim].filter(Boolean).join(' / ') || '-',
    branch: dispatch.teslimCariKodu || dispatch.cariKodu || '-',
    shipmentType,
    defaultWarehouse: dispatch.teslimCariKodu || 'NDI',
    representative: dispatch.plasiyerAciklama || dispatch.plasiyerKodu || '-',
    operationProfile,
    documentType: 'irsaliye',
    hasShipment: true,
    specialCode: operationProfile === 'disTicaret' || (exportType && exportType !== '-') ? 'K' : 'N',
    description: dispatch.aciklama || '',
    tip: dispatch.tipi || '-',
    exportType,
  };
}

function mapDispatchLine(line: NetsisCustomerDispatchLineDto, index: number, order?: NdiOrder): NdiOrderLine {
  const remainingQuantity = Number(line.bakiye ?? 0);
  const quantity = Number(line.miktar ?? 0);
  const unitPrice = Number(line.tlFiyat && line.tlFiyat > 0 ? line.tlFiyat : (line.netFiyat ?? 0));
  const foreignUnitPrice = line.dovizFiyat ?? null;
  const currencyType = line.dovizTipi ?? null;
  const currencyRate = line.dovizKuru ?? null;
  const exchangeRate = line.dovizKuru ?? null;

  return {
    id: `${line.fisNo}::${line.stokKodu}::${index}`,
    orderNo: line.fisNo,
    customer: order?.customer || line.cariKodu || '-',
    route: order?.route || '-',
    shipmentType: order?.shipmentType || '-',
    stockCode: line.stokKodu,
    stockName: line.stokAdi || line.stokKodu,
    quantity,
    unitPrice,
    foreignUnitPrice,
    currencyType,
    currencyRate,
    exchangeRate,
    remainingQuantity,
    unit: line.olcuBirimi || line.olcuBr || '-',
    warehouse: order?.defaultWarehouse || 'NDI',
    deliveryNote: line.cariKodu || order?.customerCode || '-',
    status: remainingQuantity <= 0 ? 'waiting' : remainingQuantity < quantity ? 'partial' : 'ready',
  };
}

export function NdiOrderTransferPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const [prepareAttempted, setPrepareAttempted] = useState(false);
  const [isPreparingTransfer, setIsPreparingTransfer] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparedTransfer, setPreparedTransfer] = useState<NdiPreparedTransfer | null>(null);
  const [successDialogTransfer, setSuccessDialogTransfer] = useState<NdiPreparedTransfer | null>(null);
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<NdiTransferCreateResponseDto | null>(null);
  const [transferResultDialog, setTransferResultDialog] = useState<NdiTransferCreateResponseDto | null>(null);
  const preparedTransferRef = useRef<HTMLDivElement | null>(null);

  const dispatchesQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatches'],
    queryFn: ndiApi.getCustomerDispatches,
    staleTime: 60_000,
  });

  const orders = useMemo(() => (dispatchesQuery.data ?? []).map(mapDispatchToOrder), [dispatchesQuery.data]);
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);
  const selectedPrefix = selectedOrders[0] ? getOrderPrefix(selectedOrders[0]) : '-';
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
  const selectedRuleIds = new Set(selectedRules.map((rule) => rule.id));
  const selectedRuleTitles = selectedRules.map((rule) => rule.title).join(', ');
  const selectedLinesByOrderNo = useMemo(() => {
    const grouped = new Map<string, NdiOrderLine[]>();
    selectedOrderLines.forEach((line) => {
      const current = grouped.get(line.orderNo) ?? [];
      current.push(line);
      grouped.set(line.orderNo, current);
    });
    return grouped;
  }, [selectedOrderLines]);
  const ruleOutcomes = useMemo(
    () => selectedOrders.map((order) => buildRuleOutcome(order, selectedLinesByOrderNo.get(order.orderNo) ?? [])),
    [selectedOrders, selectedLinesByOrderNo]
  );
  const batchAction = useMemo(() => resolveBatchAction(selectedOrders), [selectedOrders]);
  const blockedRuleCount = ruleOutcomes.reduce((total, outcome) => total + outcome.blocks.length, 0);
  const warningCount = ruleOutcomes.reduce((total, outcome) => total + outcome.warnings.length, 0);
  const selectedLinesWithoutPrice = selectedLines.filter((line) => line.unitPrice <= 0);
  const canPrepareSelectedLines = selectedLines.length > 0 && !batchAction.mixed && blockedRuleCount === 0 && selectedLinesWithoutPrice.length === 0;
  const prepareDisabled = selectedLines.length === 0 || linesQuery.isFetching || isPreparingTransfer;

  const toggleOrder = (order: NdiOrder) => {
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    setPrepareAttempted(false);
    setPrepareError(null);
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

      return next;
    });
  };

  const toggleLine = (lineId: string) => {
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    setPrepareAttempted(false);
    setPrepareError(null);
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
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    setPrepareAttempted(false);
    setPrepareError(null);
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
    setSelectedOrderIds(new Set());
    setSelectedLineIds(new Set());
    setPrepareAttempted(false);
    setPrepareError(null);
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    void dispatchesQuery.refetch();
  };

  const prepareSelectedLines = async () => {
    setPrepareAttempted(true);
    setPrepareError(null);
    setPreparedTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);

    if (!canPrepareSelectedLines) {
      return;
    }

    setIsPreparingTransfer(true);

    try {
      await ndiApi.getNdiTransferRules();

      const outcomeByOrderNo = new Map(ruleOutcomes.map((outcome) => [outcome.orderNo, outcome]));

      const preparedLines = selectedLines.map((line) => {
        const outcome = outcomeByOrderNo.get(line.orderNo);
        const lineRatio = outcome && outcome.requestedQuantity > 0
          ? outcome.transferQuantity / outcome.requestedQuantity
          : 1;

        return {
          id: line.id,
          orderNo: line.orderNo,
          stockCode: line.stockCode,
          stockName: line.stockName,
          sourceQuantity: line.remainingQuantity,
          transferQuantity: Math.max(0, line.remainingQuantity * lineRatio),
        unitPrice: line.unitPrice,
        foreignUnitPrice: line.foreignUnitPrice,
        currencyType: line.currencyType,
          currencyRate: line.currencyRate,
          exchangeRate: line.exchangeRate,
          unit: line.unit,
          sourceWarehouse: line.warehouse,
          targetWarehouse: outcome?.targetWarehouse ?? line.warehouse,
          targetVat: outcome?.targetVat ?? null,
        };
      });

      const createdDocuments: NdiPreparedDocument[] = selectedOrders.map((order) => {
        const outcome = outcomeByOrderNo.get(order.orderNo);
        const targetSeries = outcome?.targetSeries ?? getBusinessSeries(order);
        const documentType: NdiPreparedDocument['documentType'] = outcome?.action === 'FATURALASTIR' ? 'Fatura' : 'İrsaliye';

        return {
          sourceDocumentNo: order.orderNo,
          sourceNetsisCompany: outcome?.sourceNetsisCompany ?? 'SIRKET24',
          targetNetsisCompany: outcome?.targetNetsisCompany ?? SERIES_CONFIG[getBusinessSeries(order)].netsisCompany,
          targetSeries,
          documentType,
          followUpNote: undefined,
          customerCode: order.customerCode,
          customerName: order.customer,
          description: order.description,
          date: order.documentDate,
          lineCount: preparedLines.filter((line) => line.orderNo === order.orderNo).length,
        };
      });

      const transfer = {
        actionLabel: batchAction.action ? getActionLabel(batchAction.action) : 'Hazırla',
        sourceNetsisCompanies: Array.from(new Set(ruleOutcomes.map((outcome) => outcome.sourceNetsisCompany))),
        targetNetsisCompanies: Array.from(new Set(ruleOutcomes.map((outcome) => outcome.targetNetsisCompany))),
        documentNos: selectedOrders.map((order) => order.orderNo),
        createdDocuments,
        lineCount: preparedLines.length,
        totalSourceQuantity: preparedLines.reduce((total, line) => total + line.sourceQuantity, 0),
        totalTransferQuantity: preparedLines.reduce((total, line) => total + line.transferQuantity, 0),
        lines: preparedLines,
        warnings: ruleOutcomes.flatMap((outcome) => outcome.warnings),
      };

      setPreparedTransfer(transfer);
      setSuccessDialogTransfer(transfer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NDI aktarım kuralları API yanıtı alınamadı.';
      setPrepareError(message);
    } finally {
      setIsPreparingTransfer(false);
    }
  };

  const closePreparedTransferDialog = () => {
    setSuccessDialogTransfer(null);
    window.setTimeout(() => {
      preparedTransferRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const sendPreparedTransferToNetsis = async (transfer: NdiPreparedTransfer) => {
    setSendError(null);
    setTransferResult(null);
    setIsSendingTransfer(true);

    try {
      const result = await ndiApi.createNdiTransfer({
        documents: transfer.createdDocuments.map((document) => ({
          sourceDocumentNo: document.sourceDocumentNo,
          sourceNetsisCompany: document.sourceNetsisCompany,
          targetNetsisCompany: document.targetNetsisCompany,
          targetSeries: document.targetSeries,
          documentType: document.documentType,
          customerCode: document.customerCode,
          customerName: document.customerName,
          description: document.description,
          date: document.date,
          lines: transfer.lines
            .filter((line) => line.orderNo === document.sourceDocumentNo)
            .map((line) => ({
              stockCode: line.stockCode,
              stockName: line.stockName,
              quantity: line.transferQuantity,
        unitPrice: line.unitPrice,
        foreignUnitPrice: line.foreignUnitPrice,
        currencyType: line.currencyType,
              currencyRate: line.currencyRate,
              exchangeRate: line.exchangeRate,
              unit: line.unit,
              sourceWarehouse: line.sourceWarehouse,
              targetWarehouse: line.targetWarehouse,
              vatRate: line.targetVat,
            })),
        })),
      });

      setTransferResult(result);
      setTransferResultDialog(result);
      setSuccessDialogTransfer(null);
      window.setTimeout(() => {
        preparedTransferRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NDI aktarımı Netsis tarafına gönderilemedi.';
      setSendError(message);
    } finally {
      setIsSendingTransfer(false);
    }
  };

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-[var(--crm-app-background)] text-foreground md:-mx-6 md:-mt-6">
      <div className="px-4 pt-4 md:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/35 bg-[image:var(--crm-brand-gradient)] text-white shadow-[0_14px_28px_-12px_var(--crm-brand-shadow)] dark:border-white/20 dark:bg-[#180F22] dark:[background-image:none] dark:shadow-[0_14px_28px_-12px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[image:var(--crm-brand-gradient)] opacity-0 dark:opacity-100" />
          <div className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-0 dark:opacity-40" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-[80px] opacity-0 dark:opacity-100" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-500/10 blur-[80px] opacity-0 dark:opacity-100" />

          <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-white/75 dark:text-primary/80">NDI</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight dark:text-white">İrsaliye Kalem Seçim Konsolu</h1>
              <p className="mt-1 text-sm font-semibold text-white/85 dark:text-slate-400">
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
      </div>

      <main className="grid w-full gap-4 px-4 pb-5 pt-4 md:px-6 xl:grid-cols-[430px_1fr]">
        <section className="rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] shadow-sm">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-black">İrsaliyeler</h2>
                <p className="text-xs font-semibold text-[var(--crm-app-text-muted)]">Aynı prefix grubundan birden fazla irsaliye seçin.</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-300 dark:border-white/20" />

          <div className="px-4 py-4">
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-muted)] px-3 py-2 focus-within:border-primary">
                <Search size={18} className="text-[var(--crm-app-text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground"
                  placeholder="İrsaliye, müşteri, plasiyer, teslim cari ara..."
                />
              </label>
              <button
                type="button"
                onClick={resetSelection}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] text-foreground shadow-sm transition hover:border-primary"
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
                      isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] hover:border-primary/40'
                    }`}
                  >
                    <div
                      className={`mt-1 flex h-7 w-7 items-center justify-center rounded-md border ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] text-[var(--crm-app-text-muted)]'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-foreground">{order.orderNo}</span>
                        <span className="rounded-full bg-[var(--crm-app-panel-muted)] px-2 py-0.5 text-[10px] font-black text-muted-foreground">
                          {getOrderPrefix(order)}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-bold text-muted-foreground">{order.customer}</div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[var(--crm-app-text-muted)]">
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
                      <p className="mt-3 rounded-md bg-[var(--crm-app-panel-muted)] px-2 py-1 text-[11px] font-bold text-[var(--crm-app-text-muted)]">
                        İlk 3 karakteri aynı irsaliyeler birlikte seçilebilir.
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-black text-primary">
                        {statusLabel[order.status]}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        {lineCount === undefined ? 'Satır' : `${lineCount} satır`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] shadow-sm">
          <div className="bg-[var(--crm-app-panel-muted)] px-4 pt-4 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                  <PackageCheck size={16} /> Seçili İrsaliye Grubu
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {selectedPrefix} grubu · {selectedOrders.length} irsaliye
                </h2>
                <p className="text-sm font-semibold text-[var(--crm-app-text-muted)]">
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
          </div>

          <div className="border-b border-slate-300 dark:border-white/20" />

          <div className="bg-[var(--crm-app-panel-muted)] p-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <InfoChip icon={<ShieldCheck size={15} />} label="Seçim Kuralı" value={`Prefix: ${selectedPrefix}`} />
              <InfoChip icon={<Warehouse size={15} />} label="Depolar" value={selectedWarehouses.join(', ') || '-'} />
              <InfoChip icon={<Truck size={15} />} label="Sevkiyat" value={selectedShipmentTypes.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="Sorumlu" value={selectedRepresentatives.join(', ') || '-'} />
              <InfoChip
                icon={<PackageCheck size={15} />}
                label="Netsis Şirketi"
                value={
                  ruleOutcomes.length > 0
                    ? `${Array.from(new Set(ruleOutcomes.map((outcome) => outcome.sourceNetsisCompany))).join(', ')} -> ${Array.from(new Set(ruleOutcomes.map((outcome) => outcome.targetNetsisCompany))).join(', ')}`
                    : '-'
                }
              />
            </div>

            <div className="mt-3 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--crm-app-text-muted)]">
                    <SlidersHorizontal size={15} /> Uygulanan İşlem Kuralları
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {selectedRuleTitles ? `${selectedRuleTitles} · ${batchAction.hint}` : 'İrsaliye seçildiğinde çalışacak aktarım kuralı burada gösterilir.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {batchAction.mixed ? (
                    <RuleBadge tone="danger" label="Karışık seçim" />
                  ) : batchAction.action ? (
                    <RuleBadge tone="info" label={getActionLabel(batchAction.action)} />
                  ) : (
                    <RuleBadge tone="info" label="Belge seçin" />
                  )}
                  {blockedRuleCount > 0 ? <RuleBadge tone="danger" label={`${blockedRuleCount} blok`} /> : <RuleBadge tone="success" label="Blok yok" />}
                  {warningCount > 0 ? <RuleBadge tone="warn" label={`${warningCount} uyarı`} /> : <RuleBadge tone="success" label="Uyarı yok" />}
                  <RuleBadge tone="success" label="Ek alan aktarılır" />
                </div>
              </div>
              <p className="mt-2 rounded-md border border-[#d7e1ef] bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#536780]">
                SIRKET24 kaynak şirkettir; NURAY24, WIN24 ve DISTIC24 hedef şirkete özel login/token ve kayıt bilgisidir.
              </p>
              <SeriesGuide activeRuleIds={selectedRuleIds} />
              <div className="mt-3 grid gap-2 xl:grid-cols-2">
                {ruleOutcomes.length === 0 ? (
                  <StatePanel icon={<SlidersHorizontal size={18} />} title="Kural çıktısı yok" description="Kural çıktısı için en az bir irsaliye seçin." />
                ) : (
                  ruleOutcomes.map((outcome) => <RuleOutcomeCard key={outcome.orderId} outcome={outcome} />)
                )}
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selectedRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
              {prepareAttempted && !canPrepareSelectedLines ? (
                <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                    <AlertCircle size={16} /> Seçili kalemler henüz hazırlanamaz
                  </div>
                  <div className="mt-2 space-y-1">
                    {selectedLines.length === 0 ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">En az bir satır seçilmelidir.</div>
                    ) : null}
                    {batchAction.mixed ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">İrsaliye ve fatura senaryosu aynı hazırlıkta karıştırılamaz.</div>
                    ) : null}
                    {selectedLinesWithoutPrice.map((line) => (
                      <div key={`price-${line.id}`} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">
                        {line.orderNo} / {line.stockCode}: Netsis aktarımı için satır fiyatı yok veya 0. Kaynak irsaliye fonksiyonu NET_FIYAT döndürmelidir.
                      </div>
                    ))}
                    {ruleOutcomes.flatMap((outcome) => outcome.blocks.map((block) => (
                      <div key={`${outcome.orderNo}-${block}`} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">
                        {outcome.orderNo}: {block}
                      </div>
                    )))}
                  </div>
                </div>
              ) : null}
              {isPreparingTransfer ? (
                <div className="mt-3 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#1d4ed8]">
                    <Loader2 size={16} className="animate-spin" /> API cevabı bekleniyor
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#1e3a8a]">
                    NDI aktarım kuralları API'den kontrol ediliyor. Cevap gelmeden önizleme ve başarı penceresi açılmaz.
                  </p>
                </div>
              ) : null}
              {prepareError ? (
                <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                    <AlertCircle size={16} /> API yanıtı alınamadı
                  </div>
                  <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">{prepareError}</div>
                </div>
              ) : null}
              {sendError ? (
                <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                    <AlertCircle size={16} /> Netsis gönderimi başarısız
                  </div>
                  <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">{sendError}</div>
                </div>
              ) : null}
              {isSendingTransfer ? (
                <div className="mt-3 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#1d4ed8]">
                    <Loader2 size={16} className="animate-spin" /> Netsis'e gönderiliyor
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#1e3a8a]">
                    Kayıtlar Netsis ItemSlips servisine gönderiliyor. Cevap gelmeden sonuç ekranı kapatılmaz.
                  </p>
                </div>
              ) : null}
              {transferResult ? <TransferResultPanel result={transferResult} /> : null}
              {preparedTransfer ? (
                <div ref={preparedTransferRef}>
                  <PreparedTransferPanel
                    transfer={preparedTransfer}
                    isSending={isSendingTransfer}
                    onSend={() => sendPreparedTransferToNetsis(preparedTransfer)}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-b border-slate-300 dark:border-white/20" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-strong)] text-left text-xs font-black uppercase tracking-[0.08em] text-[var(--crm-app-text-muted)]">
                  <th className={`w-14 ${NDI_TABLE_CELL}`}>
                    <button
                      type="button"
                      onClick={toggleAllLines}
                      disabled={selectedOrderLines.length === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] text-primary disabled:opacity-50"
                      aria-label="Tüm satırları seç"
                    >
                      {selectedOrderLines.length > 0 && selectedOrderLines.every((line) => selectedLineIds.has(line.id)) ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </th>
                  <th className={NDI_TABLE_CELL}>İrsaliye</th>
                  <th className={NDI_TABLE_CELL}>Stok Kodu</th>
                  <th className={NDI_TABLE_CELL}>Stok Adı</th>
                  <th className={`${NDI_TABLE_CELL} text-right`}>Miktar</th>
                  <th className={`${NDI_TABLE_CELL} text-right`}>Bakiye</th>
                        <th className={`${NDI_TABLE_CELL} text-right`}>TL Fiyatı</th>
                  <th className={`${NDI_TABLE_CELL} text-right`}>Döviz Fiyatı</th>
                  <th className={`${NDI_TABLE_CELL} text-right`}>Kur</th>
                  <th className={NDI_TABLE_CELL}>Depo/Teslim</th>
                  <th className={NDI_TABLE_CELL}>Durum</th>
                  <th className={NDI_TABLE_CELL}>Cari Kodu</th>
                </tr>
              </thead>
              <tbody>
                {linesQuery.isFetching ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10">
                      <StatePanel icon={<Loader2 className="animate-spin" size={18} />} title="Kalemler yükleniyor" />
                    </td>
                  </tr>
                ) : linesQuery.isError ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10">
                      <StatePanel
                        icon={<AlertCircle size={18} />}
                        title="Kalemler yüklenemedi"
                        description={linesQuery.error instanceof Error ? linesQuery.error.message : 'Netsis read servisi yanıt vermedi.'}
                      />
                    </td>
                  </tr>
                ) : selectedOrderLines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10">
                      <StatePanel icon={<FileText size={18} />} title="Kalem bulunamadı" description="Satırları görmek için irsaliye seçin." />
                    </td>
                  </tr>
                ) : (
                  selectedOrderLines.map((line) => {
                    const isSelected = selectedLineIds.has(line.id);

                    return (
                      <tr
                        key={line.id}
                        className={`border-b border-slate-300 dark:border-white/20 transition ${isSelected ? 'bg-primary/10' : 'bg-[var(--crm-app-panel)] hover:bg-[var(--crm-app-panel-muted)]'}`}
                      >
                        <td className={NDI_TABLE_CELL}>
                          <button
                            type="button"
                            onClick={() => toggleLine(line.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                              isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] text-muted-foreground'
                            }`}
                            aria-label="Satırı seç"
                          >
                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                        <td className={NDI_TABLE_CELL}>
                          <div className="font-black text-foreground">{line.orderNo}</div>
                          <div className="text-xs font-bold text-[var(--crm-app-text-muted)]">{line.shipmentType}</div>
                        </td>
                        <td className={`${NDI_TABLE_CELL} font-black text-primary`}>{line.stockCode}</td>
                        <td className={`${NDI_TABLE_CELL} font-bold text-foreground`}>{line.stockName}</td>
                        <td className={`${NDI_TABLE_CELL} text-right font-black`}>
                          {numberFormatter.format(line.quantity)} {line.unit}
                        </td>
                        <td className={`${NDI_TABLE_CELL} text-right font-black text-emerald-600 dark:text-emerald-400`}>
                          {numberFormatter.format(line.remainingQuantity)} {line.unit}
                        </td>
                        <td className={`${NDI_TABLE_CELL} text-right font-black ${line.unitPrice > 0 ? 'text-foreground' : 'text-red-600 dark:text-red-300'}`}>
                          {line.unitPrice > 0 ? numberFormatter.format(line.unitPrice) : 'Fiyat yok'}
                        </td>
                        <td className={`${NDI_TABLE_CELL} text-right font-bold text-[var(--crm-app-text-muted)]`}>
                            {line.foreignUnitPrice && line.foreignUnitPrice > 0 ? numberFormatter.format(line.foreignUnitPrice) : '-'}
                        </td>
                        <td className={`${NDI_TABLE_CELL} text-right font-bold text-[var(--crm-app-text-muted)]`}>
                            {line.currencyType || line.exchangeRate ? `${line.currencyType ?? '-'} / ${line.exchangeRate ? numberFormatter.format(line.exchangeRate) : '-'}` : '-'}
                        </td>
                        <td className={NDI_TABLE_CELL}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--crm-app-panel-strong)] px-2 py-1 text-xs font-black text-muted-foreground">
                            <Warehouse size={13} /> {line.warehouse}
                          </span>
                        </td>
                        <td className={NDI_TABLE_CELL}>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            {lineStatusLabel[line.status]}
                          </span>
                        </td>
                        <td className={`${NDI_TABLE_CELL} font-semibold text-[var(--crm-app-text-muted)]`}>{line.deliveryNote}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-muted)] p-4">
            <div className="text-sm font-bold text-[var(--crm-app-text-muted)]">
              Seçilen irsaliye satırları kural listesine göre seri, KDV, depo ve ek alan bilgileriyle aktarım önizlemesine hazırlanır.
            </div>
            <button
              type="button"
              onClick={prepareSelectedLines}
              disabled={prepareDisabled}
              className="rounded-lg bg-[image:var(--crm-brand-gradient)] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPreparingTransfer ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> API cevabı bekleniyor...
                </span>
              ) : selectedLines.length === 0 ? (
                'Kalem Seçin'
              ) : (
                'Seçili Kalemleri Hazırla'
              )}
            </button>
          </div>
        </section>
      </main>
      {successDialogTransfer ? (
        <TransferPreviewDialog
          transfer={successDialogTransfer}
          isSending={isSendingTransfer}
          onClose={closePreparedTransferDialog}
          onSend={() => sendPreparedTransferToNetsis(successDialogTransfer)}
        />
      ) : null}
      {transferResultDialog ? (
        <TransferResultDialog result={transferResultDialog} onClose={() => setTransferResultDialog(null)} />
      ) : null}
    </div>
  );
}

function StatePanel({ icon, title, description }: { icon: ReactElement; title: string; description?: string }): ReactElement {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-muted)] p-4 text-center">
      <span className="mb-2 text-primary">{icon}</span>
      <div className="text-sm font-black text-foreground">{title}</div>
      {description ? <div className="mt-1 text-xs font-semibold text-[var(--crm-app-text-muted)]">{description}</div> : null}
    </div>
  );
}

function PreparedTransferPanel({
  transfer,
  isSending,
  onSend,
}: {
  transfer: NdiPreparedTransfer;
  isSending: boolean;
  onSend: () => void;
}): ReactElement {
  return (
    <div className="mt-3 rounded-lg border border-[#bbf7d0] bg-[#f7fffb] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[#047857]">
            <CheckCircle2 size={16} /> Aktarım önizlemesi hazırlandı
          </div>
          <p className="mt-1 text-xs font-bold text-[#49627e]">
            {transfer.actionLabel} kural çıktısı oluşturuldu. Bu aşamada Netsis'e gönderilmedi; kontrol sonrası aşağıdaki butonla gönderilir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RuleBadge tone="success" label={`${transfer.lineCount} kalem`} />
          <RuleBadge tone="info" label={`${transfer.sourceNetsisCompanies.join(', ')} -> ${transfer.targetNetsisCompanies.join(', ')}`} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <RuleMini label="Belgeler" value={transfer.documentNos.join(', ')} />
        <RuleMini label="Kaynak Netsis" value={transfer.sourceNetsisCompanies.join(', ')} />
        <RuleMini label="Hedef Netsis" value={transfer.targetNetsisCompanies.join(', ')} />
        <RuleMini label="Aktarılacak Miktar" value={numberFormatter.format(transfer.totalTransferQuantity)} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {transfer.createdDocuments.map((document) => (
          <div key={`${document.sourceDocumentNo}-${document.targetSeries}`} className="rounded-md border border-[#bbf7d0] bg-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black text-[#047857]">{document.documentType}</div>
              <div className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-black text-[#047857]">
                {document.lineCount} kalem
              </div>
            </div>
            <div className="mt-1 text-sm font-black text-[#172033]">Hedef seri: {document.targetSeries}</div>
            <div className="mt-1 text-[11px] font-bold text-[#536780]">
              {document.sourceNetsisCompany} / {document.sourceDocumentNo} {'->'} {document.targetNetsisCompany} / {document.targetSeries}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          className="inline-flex items-center gap-2 rounded-lg bg-[#12325f] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f5eff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Netsis'e gönderiliyor...
            </>
          ) : (
            'Netsis’e Gönder'
          )}
        </button>
      </div>

      {transfer.warnings.length > 0 ? <RuleTextList title="Hazırlık Uyarıları" values={transfer.warnings} tone="warn" /> : null}

      <div className="mt-3 max-h-56 overflow-auto rounded-md border border-[#d7e1ef] bg-white">
        <table className="w-full min-w-[1040px] text-xs">
          <thead className="bg-[#edf3fb] text-left font-black uppercase tracking-[0.08em] text-[#536780]">
            <tr>
              <th className="px-3 py-2">İrsaliye</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2 text-right">Kaynak</th>
              <th className="px-3 py-2 text-right">Aktarım</th>
                            <th className="px-3 py-2 text-right">TL Fiyatı</th>
              <th className="px-3 py-2 text-right">Döviz Fiyatı</th>
              <th className="px-3 py-2 text-right">Kur</th>
              <th className="px-3 py-2">Kaynak Depo</th>
              <th className="px-3 py-2">Hedef Depo</th>
              <th className="px-3 py-2">KDV</th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((line) => (
              <tr key={line.id} className="border-t border-[#e4ebf4]">
                <td className="px-3 py-2 font-black text-[#172033]">{line.orderNo}</td>
                <td className="px-3 py-2">
                  <div className="font-black text-[#e11d73]">{line.stockCode}</div>
                  <div className="line-clamp-1 font-bold text-[#42536b]">{line.stockName}</div>
                </td>
                <td className="px-3 py-2 text-right font-black">
                  {numberFormatter.format(line.sourceQuantity)} {line.unit}
                </td>
                <td className="px-3 py-2 text-right font-black text-[#047857]">
                  {numberFormatter.format(line.transferQuantity)} {line.unit}
                </td>
                <td className="px-3 py-2 text-right font-black text-[#172033]">{numberFormatter.format(line.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-bold text-[#536780]">
                              {line.foreignUnitPrice && line.foreignUnitPrice > 0 ? numberFormatter.format(line.foreignUnitPrice) : '-'}
                </td>
                            <td className="px-3 py-2 text-right font-bold text-[#536780]">
                              {line.currencyType || line.exchangeRate ? `${line.currencyType ?? '-'} / ${line.exchangeRate ? numberFormatter.format(line.exchangeRate) : '-'}` : '-'}
                            </td>
                <td className="px-3 py-2 font-bold text-[#42536b]">{line.sourceWarehouse}</td>
                <td className="px-3 py-2 font-bold text-[#42536b]">{line.targetWarehouse}</td>
                <td className="px-3 py-2 font-bold text-[#42536b]">{line.targetVat ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransferPreviewDialog({
  transfer,
  isSending,
  onClose,
  onSend,
}: {
  transfer: NdiPreparedTransfer;
  isSending: boolean;
  onClose: () => void;
  onSend: () => void;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1220]/60 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl border border-[#d7e1ef] bg-white shadow-2xl">
        <div className="border-b border-[#d7e1ef] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#047857]">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#172033]">Netsis aktarım önizlemesi</h3>
              <p className="mt-1 text-sm font-semibold text-[#5c6f87]">
                Seçili kalemler Excel/NDI kuralına göre hazırlandı. Bu adımda Netsis'e kayıt atılmaz; gerçek irsaliye/fatura oluşturma için alttaki gönderim butonunu kullanın.
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto p-5">
          <div className="mb-4 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-bold text-[#1e3a8a]">
            Henüz Netsis'e kayıt atılmadı. Kontrol ettikten sonra "Netsis'te İrsaliye/Fatura Oluştur" dediğinizde API çağrılır,
            işlem bitene kadar beklenir ve dönen Netsis belge numaraları ayrı sonuç ekranında gösterilir.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {transfer.createdDocuments.map((document) => (
              <div key={`${document.sourceDocumentNo}-${document.targetSeries}`} className="rounded-xl border border-[#bbf7d0] bg-[#f7fffb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-black text-[#047857]">
                    {document.documentType}
                  </span>
                  <span className="text-xs font-black text-[#536780]">{document.lineCount} kalem</span>
                </div>
                <div className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-[#536780]">Hedef Netsis seri</div>
                <div className="mt-1 break-all text-lg font-black text-[#172033]">{document.targetSeries}</div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-[#536780]">
                  <div className="rounded-md bg-white px-3 py-2">
                    Kaynak: {document.sourceNetsisCompany} / {document.sourceDocumentNo}
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    Hedef: {document.targetNetsisCompany} / Seri {document.targetSeries}
                  </div>
                  {document.followUpNote ? (
                    <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[#92400e]">
                      {document.followUpNote}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {transfer.warnings.length > 0 ? <RuleTextList title="Aktarım Uyarıları" values={transfer.warnings} tone="warn" /> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#d7e1ef] bg-[#f8fbff] p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-[#d7e1ef] bg-white px-6 py-3 text-sm font-black text-[#12325f] shadow-sm transition hover:border-[#12325f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Önizlemeyi kapat
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#12325f] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f5eff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Netsis'e gönderiliyor...
              </>
            ) : (
              'Netsis’te İrsaliye/Fatura Oluştur'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferResultPanel({ result }: { result: NdiTransferCreateResponseDto }): ReactElement {
  return (
    <div className="mt-3 rounded-lg border border-[#bbf7d0] bg-[#f7fffb] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[#047857]">
            <CheckCircle2 size={16} /> Netsis aktarım sonucu
          </div>
          <p className="mt-1 text-xs font-bold text-[#49627e]">
            Netsis API dönüşüne göre başarılı ve başarısız belgeler aşağıdadır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RuleBadge tone="success" label={`${result.createdDocuments.length} başarılı`} />
          {result.failedDocuments.length > 0 ? <RuleBadge tone="danger" label={`${result.failedDocuments.length} hatalı`} /> : null}
        </div>
      </div>

      {result.createdDocuments.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {result.createdDocuments.map((document) => (
            <div key={`${document.sourceDocumentNo}-${document.netsisDocumentNo}`} className="rounded-md border border-[#bbf7d0] bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-black text-[#047857]">
                  {document.documentType}
                </span>
                <span className="text-[10px] font-black text-[#536780]">{document.lineCount} kalem</span>
              </div>
              <div className="mt-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#536780]">Netsis kayıt no</div>
              <div className="mt-1 break-all text-lg font-black text-[#172033]">{document.netsisDocumentNo}</div>
              <div className="mt-2 grid gap-1 text-[11px] font-bold text-[#536780]">
                <div className="rounded bg-[#f8fbff] px-2 py-1">Kaynak: {document.sourceNetsisCompany} / {document.sourceDocumentNo}</div>
                <div className="rounded bg-[#f8fbff] px-2 py-1">Hedef: {document.targetNetsisCompany} / Seri {document.targetSeries}</div>
                {document.netsisRecordNo ? <div className="rounded bg-[#f8fbff] px-2 py-1">Kayıt No: {document.netsisRecordNo}</div> : null}
                {document.netsisReferenceNo ? <div className="rounded bg-[#f8fbff] px-2 py-1">Referans No: {document.netsisReferenceNo}</div> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {result.failedDocuments.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
            <AlertCircle size={16} /> Hatalı belgeler
          </div>
          <div className="mt-2 space-y-1">
            {result.failedDocuments.map((document) => (
              <div key={`${document.sourceDocumentNo}-${document.errorMessage}`} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">
                {document.sourceDocumentNo} / {document.documentType} / Seri {document.targetSeries}: {document.errorMessage}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.warnings.length > 0 ? <RuleTextList title="Aktarım Uyarıları" values={result.warnings} tone="warn" /> : null}
    </div>
  );
}

function TransferResultDialog({ result, onClose }: { result: NdiTransferCreateResponseDto; onClose: () => void }): ReactElement {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b1220]/60 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl border border-[#d7e1ef] bg-white shadow-2xl">
        <div className="border-b border-[#d7e1ef] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#047857]">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#172033]">Netsis API sonucu</h3>
              <p className="mt-1 text-sm font-semibold text-[#5c6f87]">
                Bu ekran Netsis'e gönderim çağrısından sonra açılır. Başarılı oluşan irsaliye/fatura numaraları ve varsa hatalı belgeler aşağıdadır.
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-auto p-5">
          {result.createdDocuments.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {result.createdDocuments.map((document) => (
                <div key={`${document.sourceDocumentNo}-${document.netsisDocumentNo}`} className="rounded-xl border border-[#bbf7d0] bg-[#f7fffb] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-black text-[#047857]">
                      Başarılı {document.documentType}
                    </span>
                    <span className="text-xs font-black text-[#536780]">{document.lineCount} kalem</span>
                  </div>
                  <div className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-[#536780]">Netsis belge/kayıt no</div>
                  <div className="mt-1 break-all text-lg font-black text-[#172033]">{document.netsisDocumentNo}</div>
                  <div className="mt-3 grid gap-2 text-xs font-bold text-[#536780]">
                    <div className="rounded-md bg-white px-3 py-2">Kaynak: {document.sourceNetsisCompany} / {document.sourceDocumentNo}</div>
                    <div className="rounded-md bg-white px-3 py-2">Hedef: {document.targetNetsisCompany} / Seri {document.targetSeries}</div>
                    {document.netsisRecordNo ? <div className="rounded-md bg-white px-3 py-2">Kayıt No: {document.netsisRecordNo}</div> : null}
                    {document.netsisReferenceNo ? <div className="rounded-md bg-white px-3 py-2">Referans No: {document.netsisReferenceNo}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#fecaca] bg-[#fff8f8] p-4 text-sm font-black text-[#b91c1c]">
              Netsis tarafında başarılı kayıt dönmedi.
            </div>
          )}

          {result.failedDocuments.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fff8f8] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                <AlertCircle size={16} /> Hatalı belgeler
              </div>
              <div className="mt-2 space-y-1">
                {result.failedDocuments.map((document) => (
                  <div key={`${document.sourceDocumentNo}-${document.errorMessage}`} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">
                    {document.sourceDocumentNo} / {document.documentType} / Seri {document.targetSeries}: {document.errorMessage}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.warnings.length > 0 ? <RuleTextList title="Aktarım Uyarıları" values={result.warnings} tone="warn" /> : null}
        </div>

        <div className="flex justify-end border-t border-[#d7e1ef] bg-[#f8fbff] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#12325f] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f5eff]"
          >
            Sonucu gördüm, pencereyi kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: ReactElement; label: string; value: string }): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--crm-app-text-muted)]">{label}</span>
        <span className="block truncate text-sm font-black text-foreground">{value}</span>
      </span>
    </div>
  );
}

function SeriesGuide({ activeRuleIds }: { activeRuleIds: Set<NdiTransferRule['id']> }): ReactElement {
  const rows: Array<{ id: NdiTransferRule['id']; title: string; items: string[] }> = [
    { id: 'nuray', title: 'NURAY24 Netsis Şirketi (NUR)', items: ['Kayıt hedefi -> NURAY24', 'İrsaliye -> kaynak seri', 'Fatura ayrı işlem', '1/4 -> miktar 1/4 + KDV %5', 'TAM -> miktar tam + KDV %20'] },
    { id: 'windoformKapi', title: 'WIN24 Netsis Şirketi (VIN)', items: ['Kayıt hedefi -> WIN24', 'İrsaliye -> kaynak seri', 'Fatura ayrı işlem', 'K -> KDV 0'] },
    { id: 'disTicaret', title: 'DISTIC24 Netsis Şirketi (DIS)', items: ['Kayıt hedefi -> DISTIC24', 'Fatura/İrsaliye -> EIR', 'Depo -> 100 sabit', 'KDV -> 0', 'Gün kuru alınır'] },
    { id: 'sirket24', title: 'SIRKET24 Netsis Şirketi (SIP)', items: ['Kayıt hedefi -> SIRKET24', 'Fatura -> SIP2026', 'KDV -> 0', 'Resmi evrak yok'] },
  ];
  const hasActiveRule = activeRuleIds.size > 0;

  return (
    <div className="mt-3 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-muted)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--crm-app-text-muted)]">Seri ve Depo Rehberi</div>
          <p className="mt-1 text-xs font-semibold text-[var(--crm-app-text-muted)]">
            Seçilen irsaliyenin kaynak şirketi ve seri bilgisine göre çalışacak NDI kuralı aşağıda vurgulanır.
          </p>
        </div>
        <RuleBadge tone={hasActiveRule ? 'success' : 'info'} label={hasActiveRule ? 'Aktif kural vurgulandı' : 'İrsaliye seçince kural görünür'} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => {
          const isActive = activeRuleIds.has(row.id);

          return (
            <div
              key={row.title}
              className={`rounded-md border px-3 py-2 transition ${
                isActive
                  ? 'border-primary bg-primary/10 shadow-[0_0_0_2px_rgba(236,72,153,0.12)]'
                  : 'border-slate-300 bg-[var(--crm-app-panel)] dark:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-black text-foreground">{row.title}</div>
                {isActive ? <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white">Aktif</span> : null}
              </div>
              <div className="mt-2 space-y-1">
                {row.items.map((item) => (
                  <div key={item} className={`rounded px-2 py-1 text-[11px] font-black ${isActive ? 'bg-white/70 text-foreground dark:bg-black/20' : 'bg-primary/10 text-muted-foreground'}`}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleOutcomeCard({ outcome }: { outcome: NdiRuleOutcome }): ReactElement {
  return (
    <div className={`rounded-lg border p-3 ${outcome.canProceed ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/30' : 'border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/30'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-black text-foreground">{outcome.orderNo}</div>
          <div className="text-xs font-bold text-[var(--crm-app-text-muted)]">
            {outcome.companyLabel} · Netsis {outcome.sourceNetsisCompany} {'->'} {outcome.targetNetsisCompany} · {outcome.actionLabel} · kaynak prefix {outcome.sourcePrefix}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <RuleBadge tone={outcome.canProceed ? 'success' : 'danger'} label={outcome.canProceed ? 'Hazır' : 'Bloklu'} />
          <RuleBadge tone={outcome.targetWarehouseLocked ? 'warn' : 'info'} label={outcome.targetWarehouseLocked ? 'Depo sabit' : 'Depo seçilebilir'} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <RuleMini label="Hedef Seri" value={outcome.targetSeries} />
        <RuleMini label="Hedef Depo" value={outcome.targetWarehouseLabel} />
        <RuleMini
          label="Aktarılacak Miktar"
          value={`${outcome.quantityRuleLabel}: ${numberFormatter.format(outcome.transferQuantity)} / ${numberFormatter.format(outcome.requestedQuantity)}`}
        />
        <RuleMini
          label="KDV"
          value={`Kaynak ${outcome.sourceVat ?? '-'} / Hedef ${outcome.targetVat ?? '-'}`}
        />
      </div>

      <RuleTextList title="Sistem Kuralları" values={outcome.systemNotes} tone="info" />
      <RuleTextList title="Kullanıcı Kontrolü" values={outcome.userNotes} tone="success" />
      <RuleTextList title="Uyarılar" values={outcome.warnings} tone="warn" />
      <RuleTextList title="Bloklayan Kurallar" values={outcome.blocks} tone="danger" />
    </div>
  );
}

function RuleMini({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] px-2 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--crm-app-text-muted)]">{label}</div>
      <div className="mt-1 truncate text-xs font-black text-foreground">{value}</div>
    </div>
  );
}

function RuleTextList({ title, values, tone }: { title: string; values: string[]; tone: 'info' | 'success' | 'warn' | 'danger' }): ReactElement | null {
  if (values.length === 0) {
    return null;
  }

  const dotClass = {
    info: 'bg-blue-600 dark:bg-blue-400',
    success: 'bg-emerald-600 dark:bg-emerald-400',
    warn: 'bg-amber-600 dark:bg-amber-400',
    danger: 'bg-red-600 dark:bg-red-400',
  }[tone];

  return (
    <div className="mt-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--crm-app-text-muted)]">{title}</div>
      <div className="mt-1 space-y-1">
        {values.map((value) => (
          <div key={value} className="flex gap-2 rounded-md bg-[var(--crm-app-panel)] px-2 py-1 text-xs font-bold leading-snug text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleCard({ rule }: { rule: NdiTransferRule }): ReactElement {
  return (
    <div className="rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel-muted)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-black text-foreground">{rule.title}</div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-primary">
          {rule.documentType}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--crm-app-text-muted)] sm:grid-cols-2">
        <RuleLine label="Kaynak Seri" value={rule.sourceSerial} />
        <RuleLine label="Netsis Şirketi" value={`${rule.sourceNetsisCompany} -> ${rule.targetNetsisCompany}`} />
        <RuleLine label="Hedef" value={`${rule.targetCompany} / ${rule.targetSerial}`} />
        <RuleLine label="Sevk" value={rule.shipmentRule} />
        <RuleLine label="KDV" value={rule.taxRule} />
        <RuleLine label="Depo" value={rule.warehouseRule} />
        <RuleLine label="Not" value={rule.transferNote} />
        <RuleLine label="Evrak" value={rule.officialNote} />
        <RuleLine label="Toplu" value={rule.bulkNote} />
      </div>
    </div>
  );
}

function RuleLine({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md bg-[var(--crm-app-panel)] px-2 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--crm-app-text-muted)]">{label}</div>
      <div className="mt-1 leading-snug text-muted-foreground">{value}</div>
    </div>
  );
}

function RuleBadge({ label, tone }: { label: string; tone: 'info' | 'success' | 'warn' | 'danger' }): ReactElement {
  const toneClass = {
    info: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-300',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    warn: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300',
    danger: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300',
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}>{label}</span>;
}

function MetricPill({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg border border-white/35 bg-black/20 px-3 py-2 backdrop-blur-sm dark:border-white/20 dark:bg-white/5">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="min-w-24 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] px-3 py-2 text-right">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--crm-app-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-black text-foreground">{value}</div>
    </div>
  );
}
