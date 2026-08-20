import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
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

import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

import {
  ndiApi,
  type NdiTransferCreateRequest,
  type NdiManualDocumentRequest,
  type NdiTransferCreateResponseDto,
  type NdiTransferCreatedDocumentDto,
  type NdiTransferFailedDocumentDto,
  type NdiTransferPreviewDocumentDto,
  type NdiTransferredRecordDto,
  type NetsisCustomerDispatchDto,
  type NetsisCustomerDispatchLineDto,
  type NetsisCustomerDispatchOrderCheckDto,
  type NetsisCustomerDocumentSeriesDto,
  type NetsisNdiTransferScenarioDto,
  type NetsisNdiTransferRuleDto,
} from '../api/ndi-api';
import { NdiConnectionTestDialog } from './NdiConnectionTestDialog';

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
  lineSpecialCode1?: string | null;
  remainingQuantity: number;
  unit: string;
  warehouse: string;
  deliveryNote: string;
  ekalan?: string | null;
  ekalan1?: string | null;
  status: 'ready' | 'partial' | 'waiting';
}

interface NdiPreparedLine {
  id: string;
  sourceLineNo: number;
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
  lineSpecialCode1?: string | null;
  unit: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  targetVat: number | null;
  ekalan?: string | null;
  ekalan1?: string | null;
}

interface NdiPreparedDocument {
  sourceDocumentNo: string;
  sourceOrderNo?: string | null;
  businessRule?: NdiBusinessSeries | null;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSeries: string;
  documentType: 'İrsaliye' | 'Fatura';
  sourceType: string;
  hasShipment: boolean;
  shippingCustomerCode?: string | null;
  specialCode1?: string | null;
  specialCode2?: string | null;
  exportRefNo?: string | null;
  orderExportType?: number | null;
  orderTipi?: number | null;
  projectCode?: string | null;
  followUpNote?: string;
  customerCode: string;
  customerName: string;
  description: string;
  date: string | null;
  lineCount: number;
}

interface NdiPreparedTransfer {
  actionLabel: string;
  mode: NdiTransferMode;
  dispatchSeries: string;
  invoiceSeries: string;
  quantityMode: NdiQuantityMode;
  manualDocuments: NdiManualDocumentRequest[];
  sourceNetsisCompanies: string[];
  targetNetsisCompanies: string[];
  documentNos: string[];
  createdDocuments: NdiPreparedDocument[];
  lineCount: number;
  totalSourceQuantity: number;
  totalTransferQuantity: number;
  targetDocumentGroupCount: number;
  sirket24InvoiceGroupCount: number;
  previewDocuments: NdiTransferPreviewDocumentDto[];
  lines: NdiPreparedLine[];
  warnings: string[];
}

function buildNdiTransferRequest(transfer: NdiPreparedTransfer): NdiTransferCreateRequest {
  assertPreparedSeriesIntegrity(transfer);
  return {
    mode: transfer.mode,
    dispatchSeries: transfer.dispatchSeries,
    invoiceSeries: transfer.invoiceSeries,
    quantityMode: transfer.quantityMode,
    manualDocuments: transfer.manualDocuments,
    documents: transfer.createdDocuments.map((document) => ({
      sourceDocumentNo: document.sourceDocumentNo,
      sourceOrderNo: document.sourceOrderNo,
      businessRule: document.businessRule,
      sourceNetsisCompany: document.sourceNetsisCompany,
      targetNetsisCompany: document.targetNetsisCompany,
      targetSeries: document.targetSeries,
      documentType: document.documentType,
      sourceType: document.sourceType,
      hasShipment: document.hasShipment,
      shippingCustomerCode: document.shippingCustomerCode,
      specialCode1: document.specialCode1,
      specialCode2: document.specialCode2,
      exportRefNo: document.exportRefNo,
      exportType: document.orderExportType,
      tipi: document.orderTipi,
      projectCode: document.projectCode,
      customerCode: document.customerCode,
      customerName: document.customerName,
      description: document.description,
      date: document.date,
      lines: transfer.lines
        .filter((line) => line.orderNo === document.sourceDocumentNo)
        .map((line) => ({
          sourceLineId: line.id,
          sourceLineNo: line.sourceLineNo,
          stockCode: line.stockCode,
          stockName: line.stockName,
          sourceQuantity: line.sourceQuantity,
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
          ekalan: line.ekalan,
          ekalan1: line.ekalan1,
        })),
    })),
  };
}

function assertPreparedSeriesIntegrity(transfer: NdiPreparedTransfer): void {
  if (transfer.mode === 'automatic') {
    if (!isValidNdiSeries(transfer.invoiceSeries)) {
      throw new Error('NDI fatura serisi seçimi kayboldu. Belge gönderilmedi; seriyi yeniden seçin.');
    }

    transfer.createdDocuments.forEach((document) => {
      const selectedSeries = document.documentType === 'İrsaliye'
        ? transfer.dispatchSeries
        : transfer.invoiceSeries;
      if (!isValidNdiSeries(selectedSeries)
        || normalizeNdiSeriesInput(document.targetSeries) !== normalizeNdiSeriesInput(selectedSeries)) {
        throw new Error(
          `${document.sourceDocumentNo}: önizlemedeki ${document.targetSeries || 'boş'} serisi, ekranda seçilen ${selectedSeries || 'boş'} serisiyle aynı değil. Belge gönderilmedi.`
        );
      }
    });
    return;
  }

  const manualSeries = new Map(transfer.manualDocuments.map((selection) => [
    `${selection.targetNetsisCompany.trim().toUpperCase()}|${selection.documentType}`,
    normalizeNdiSeriesInput(selection.targetSeries),
  ]));
  if (transfer.manualDocuments.length === 0
    || transfer.manualDocuments.some((selection) => !isValidNdiSeries(selection.targetSeries))) {
    throw new Error('Manuel NDI belge planındaki seri seçimi geçersiz. Belge gönderilmedi; serileri yeniden seçin.');
  }

  transfer.createdDocuments.forEach((document) => {
    const key = `${document.targetNetsisCompany.trim().toUpperCase()}|${document.documentType}`;
    const selectedSeries = manualSeries.get(key);
    if (!selectedSeries
      || !isValidNdiSeries(selectedSeries)
      || normalizeNdiSeriesInput(document.targetSeries) !== selectedSeries) {
      throw new Error(
        `${document.sourceDocumentNo}: manuel seçilen belge serisi önizleme ile aynı değil. Belge gönderilmedi; seriyi yeniden seçin.`
      );
    }
  });
}

interface NdiOrder {
  id: string;
  orderNo: string;
  sourceOrderNo?: string | null;
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
  shippingCustomerCode?: string | null;
  shippingCustomerName?: string | null;
  specialCode1?: string | null;
  specialCode2?: string | null;
  exportRefNo?: string | null;
  orderExportType?: number | null;
  orderTipi?: number | null;
  projectCode?: string | null;
  description: string;
  tip: string;
  exportType: string;
}

interface NdiTransferRule {
  id: NdiOrder['operationProfile'];
  title: string;
  sourceSerial: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
}

type NdiBusinessSeries = 'NUR' | 'VIN' | 'DIS' | 'SIP';
type NdiBatchAction = 'IRSALIYELISTIR' | 'FATURALASTIR';
type NdiQuantityMode = 'auto' | 'full' | 'quarter';
type NdiTransferMode = 'automatic' | 'manual';
type NdiManualTarget = 'NURAY24' | 'WIN24' | 'DISTIC24' | 'SIRKET24';
type NdiManualDocumentType = 'İrsaliye' | 'Fatura';
const MANUAL_TARGETS: NdiManualTarget[] = ['NURAY24', 'WIN24', 'DISTIC24', 'SIRKET24'];

interface NdiDecisionContext {
  mode: NdiTransferMode;
  manualTarget: NdiManualTarget;
  manualDocumentType: NdiManualDocumentType;
}

const normalizeNdiSeriesInput = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

const isValidNdiSeries = (value: string): boolean => /^[A-Z0-9]{3}$/.test(value);

function getDocumentSeriesOptions(
  rows: NetsisCustomerDocumentSeriesDto[],
  documentType: NdiManualDocumentType
): ComboboxOption[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const rawValue = documentType === 'İrsaliye' ? row.dispatchSeries : row.invoiceSeries;
    const value = normalizeNdiSeriesInput(rawValue?.trim() ?? '');
    if (!value || seen.has(value)) {
      return [];
    }

    seen.add(value);
    return [{
      value,
      label: documentType === 'İrsaliye'
        ? `${row.dispatchDocumentType || 'İrsaliye'} — ${value}`
        : `E-Fatura: ${row.eInvoiceActive || '-'} — ${row.invoiceDocumentType || 'Fatura'} — ${value}`,
    }];
  });
}

const hasSeparateShippingCustomer = (customerCode: string, shippingCustomerCode?: string | null): boolean => {
  const normalizedCustomerCode = customerCode.trim().toLocaleUpperCase('tr-TR');
  const normalizedShippingCode = shippingCustomerCode?.trim().toLocaleUpperCase('tr-TR') ?? '';

  return normalizedShippingCode.length > 0 && normalizedShippingCode !== normalizedCustomerCode;
};

interface NdiSeriesConfig {
  label: string;
  netsisCompany: string;
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
  primaryVat: number | null;
  sirket24Vat: number | null;
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
    sourceSerial: 'NUR',
    sourceNetsisCompany: 'SIRKET24',
    targetNetsisCompany: 'NURAY24',
  },
  {
    id: 'windoformKapi',
    title: 'WINDOFORM KAPI',
    sourceSerial: 'VIN',
    sourceNetsisCompany: 'SIRKET24',
    targetNetsisCompany: 'WIN24',
  },
  {
    id: 'disTicaret',
    title: 'DIŞ TİCARET',
    sourceSerial: 'DIS',
    sourceNetsisCompany: 'SIRKET24',
    targetNetsisCompany: 'DISTIC24',
  },
  {
    id: 'sirket24',
    title: 'ŞİRKET24 Fatura',
    sourceSerial: 'SIP',
    sourceNetsisCompany: 'SIRKET24',
    targetNetsisCompany: 'SIRKET24',
  },
];

const SERIES_CONFIG: Record<NdiBusinessSeries, NdiSeriesConfig> = {
  NUR: { label: 'NURAY', netsisCompany: 'NURAY24' },
  VIN: { label: 'WINDOFORM KAPI', netsisCompany: 'WIN24' },
  DIS: { label: 'DIŞ TİCARET', netsisCompany: 'DISTIC24' },
  SIP: { label: 'ŞİRKET24', netsisCompany: 'SIRKET24' },
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

const priceFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const NDI_TABLE_CELL = 'border-r border-slate-300 px-4 py-3 dark:border-white/20 last:border-r-0';

function getOrderPrefix(order: NdiOrder): string {
  return order.orderNo.slice(0, 3).toLocaleUpperCase('tr-TR');
}

function getKnownSeries(value: string): NdiBusinessSeries | null {
  const normalized = value.trim().toLocaleUpperCase('tr-TR');
  const sourceSeries = normalized.match(/^[A-ZÇĞİÖŞÜ]+/u)?.[0] ?? '';

  if (sourceSeries.startsWith('NUR') || sourceSeries === 'N') {
    return 'NUR';
  }
  if (sourceSeries.startsWith('VIN') || sourceSeries === 'WIN' || sourceSeries === 'V') {
    return 'VIN';
  }
  if (sourceSeries.startsWith('DIS') || sourceSeries === 'D') {
    return 'DIS';
  }
  if (sourceSeries.startsWith('SIP') || sourceSeries === 'S') {
    return 'SIP';
  }

  return null;
}

function getSeriesFromCompanyCode(value?: string | null): NdiBusinessSeries | null {
  switch (value?.trim().toLocaleUpperCase('tr-TR')) {
    case 'V':
      return 'VIN';
    case 'S':
      return 'SIP';
    case 'N':
      return 'NUR';
    case 'D':
      return 'DIS';
    default:
      return null;
  }
}

function getRule(order: NdiOrder): NdiTransferRule {
  return transferRules.find((rule) => rule.id === order.operationProfile) ?? transferRules[0];
}

function getRuleByTarget(target: NdiManualTarget): NdiTransferRule {
  return transferRules.find((rule) => rule.targetNetsisCompany === target) ?? transferRules[0];
}

function getDecisionRule(order: NdiOrder, context: NdiDecisionContext): NdiTransferRule {
  return context.mode === 'manual' ? getRuleByTarget(context.manualTarget) : getRule(order);
}

function shouldCreateOnlySirket24Invoice(order: NdiOrder, rule: NdiTransferRule): boolean {
  return rule.id === 'disTicaret'
    || order.sourceOrderNo?.trim().toLocaleUpperCase('tr-TR').startsWith('D') === true;
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
  // Keep explicit legacy document series authoritative; KOD1=N is also used
  // by existing WIN documents as a normal-operation marker.
  const series = getKnownSeries(dispatch.irsaliyeNo)
    ?? getSeriesFromCompanyCode(dispatch.ozelKod1);
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
  const knownSeries = getKnownSeries(order.sourceOrderNo || order.orderNo);
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

function resolvePrimaryAction(order: NdiOrder, context: NdiDecisionContext): NdiBatchAction {
  const rule = getDecisionRule(order, context);
  const series = rule.sourceSerial as NdiBusinessSeries;

  if (context.mode === 'automatic' && shouldCreateOnlySirket24Invoice(order, rule)) {
    return 'FATURALASTIR';
  }

  if (context.mode === 'manual') {
    if (series === 'SIP') {
      return 'FATURALASTIR';
    }
    return context.manualDocumentType === 'Fatura' ? 'FATURALASTIR' : 'IRSALIYELISTIR';
  }

  if (series === 'SIP') {
    return 'FATURALASTIR';
  }

  const dispatchIsMandatory = order.hasShipment
    || hasSeparateShippingCustomer(order.customerCode, order.shippingCustomerCode)
    || (series === 'VIN' && order.specialCode1?.trim().toLocaleUpperCase('tr-TR') === 'K');

  return dispatchIsMandatory ? 'IRSALIYELISTIR' : 'FATURALASTIR';
}

function resolveBatchAction(outcomes: NdiRuleOutcome[]): { action: NdiBatchAction | null; mixed: boolean; hint: string } {
  if (outcomes.length === 0) {
    return { action: null, mixed: false, hint: 'Belge seçin' };
  }

  const actions = outcomes.map((outcome) => outcome.action);
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
  const config = SERIES_CONFIG[series];
  return {
    value: '',
    note: `${config.label}: belge serisi kullanıcının seçtiği 3 karakterli irsaliye veya fatura serisinden alınır.`,
  };
}

function resolveEffectiveTargetSeries(
  action: NdiBatchAction,
  selectedDispatchSeries: string,
  selectedInvoiceSeries: string
): string {
  return action === 'IRSALIYELISTIR' ? selectedDispatchSeries : selectedInvoiceSeries;
}

function resolveWarehouse(rule: NdiTransferRule): { value: string; label: string; locked: boolean; note: string } {
  const warehouseConfig = COMPANY_WAREHOUSE_CONFIG[rule.id];
  const option = warehouseConfig.warehouses.find((item) => item.code === warehouseConfig.default) ?? warehouseConfig.warehouses[0];
  const isDistic = rule.id === 'disTicaret';

  return {
    value: isDistic ? (option?.code ?? '100') : '',
    label: isDistic ? (option ? `${option.code} - ${option.label}` : '100') : 'Kaynak kalem deposu',
    locked: isDistic,
    note: isDistic
      ? `${warehouseConfig.label} için hedef depo ${warehouseConfig.default} sabit kuraldır.`
      : `${warehouseConfig.label} için her kalemin kaynak depo kodu değiştirilmeden korunur.`,
  };
}

function resolveVat(order: NdiOrder, rule: NdiTransferRule, quantityMode: NdiQuantityMode): { primaryVat: number | null; sirket24Vat: number | null; note: string; block?: string } {
  const series = rule.sourceSerial as NdiBusinessSeries;
  const description = normalizeText(order.description);
  const specialCode1 = order.specialCode1?.trim().toLocaleUpperCase('tr-TR');

  if (series === 'DIS' || series === 'SIP') {
    return { primaryVat: 0, sirket24Vat: 0, note: 'Dış ticaret ve yalnız Şirket24 senaryosunda KDV %0.' };
  }

  if (series === 'NUR') {
    if (quantityMode === 'quarter' || (quantityMode === 'auto' && description.includes('1/4'))) {
      return { primaryVat: 20, sirket24Vat: 5, note: 'NURAY24 KDV %20; 1/4 işlemin SIRKET24 faturasında KDV %5.' };
    }
    return { primaryVat: 20, sirket24Vat: 20, note: 'TAM işlemde NURAY24 ve SIRKET24 KDV %20.' };
  }

  if (series === 'VIN') {
    if (specialCode1 === 'K') {
      return { primaryVat: 0, sirket24Vat: 0, note: 'Özel Kod K: WIN24 ve SIRKET24 KDV %0.' };
    }
    return { primaryVat: 20, sirket24Vat: 20, note: 'Özel Kod K dışındaki WIN24 işlemlerinde iki tarafta KDV %20.' };
  }

  return { primaryVat: null, sirket24Vat: null, note: 'KDV kuralı belirlenemedi.', block: 'Seri tanımsız olduğu için KDV kuralı uygulanamadı.' };
}

function resolveQuantityRule(order: NdiOrder, lines: NdiOrderLine[], rule: NdiTransferRule, quantityMode: NdiQuantityMode): { label: string; requestedQuantity: number; transferQuantity: number; note: string; block?: string } {
  const series = rule.sourceSerial as NdiBusinessSeries;
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

  if (quantityMode === 'quarter') {
    return {
      label: '1/4',
      requestedQuantity,
      transferQuantity: requestedQuantity / 4,
      note: `Kullanıcı 1/4 aktarımı seçti: ${numberFormatter.format(requestedQuantity)} miktarın ${numberFormatter.format(requestedQuantity / 4)} kadarı aktarılır.`,
    };
  }

  if (quantityMode === 'full') {
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

  return {
    label: description.includes('tam') ? 'TAM' : 'Tam',
    requestedQuantity,
    transferQuantity: requestedQuantity,
    note: 'NURAY açıklamasında 1/4 bulunmadığı için kalan miktarın tamamı aktarılır.',
  };
}

function resolveManualQuantityRule(
  lines: NdiOrderLine[],
  quantityMode: NdiQuantityMode
): { label: string; requestedQuantity: number; transferQuantity: number; note: string; block?: string } {
  const requestedQuantity = lines.reduce((total, line) => total + Math.max(line.remainingQuantity, 0), 0);
  const isQuarter = quantityMode === 'quarter';
  return {
    label: isQuarter ? '1/4' : 'Tam',
    requestedQuantity,
    transferQuantity: isQuarter ? requestedQuantity / 4 : requestedQuantity,
    note: isQuarter
      ? `Manuel 1/4 seçimi: ${numberFormatter.format(requestedQuantity)} miktarın ${numberFormatter.format(requestedQuantity / 4)} kadarı aktarılır.`
      : 'Manuel seçimde kalan miktarın tamamı aktarılır.',
  };
}

function buildRuleOutcome(
  order: NdiOrder,
  lines: NdiOrderLine[],
  quantityMode: NdiQuantityMode,
  context: NdiDecisionContext
): NdiRuleOutcome {
  const rule = getDecisionRule(order, context);
  const onlySirket24Invoice = context.mode === 'automatic'
    && shouldCreateOnlySirket24Invoice(order, rule);
  const effectiveRule = onlySirket24Invoice ? getRuleByTarget('DISTIC24') : rule;
  const series = effectiveRule.sourceSerial as NdiBusinessSeries;
  const sourcePrefix = getOrderPrefix(order);
  const action = resolvePrimaryAction(order, context);
  const targetSeries = resolveTargetSeries(order);
  const warehouse = resolveWarehouse(effectiveRule);
  const vat = resolveVat(order, effectiveRule, quantityMode);
  const quantityRule = context.mode === 'manual'
    ? resolveManualQuantityRule(lines, quantityMode)
    : resolveQuantityRule(order, lines, effectiveRule, quantityMode);
  const zeroBalanceCount = lines.filter((line) => line.quantity > 0 && line.remainingQuantity <= 0).length;
  const warnings: string[] = [];
  const blocks: string[] = [];
  const systemNotes: string[] = context.mode === 'manual'
    ? [
        'Manuel mod: hedef şirket ve belge türü kullanıcı seçiminden alınır; otomatik yönlendirme ve takip faturası uygulanmaz.',
        targetSeries.note,
        quantityRule.note,
        'Ek alan 1 ve satır bilgileri aktarım payloadında korunmalıdır.',
      ]
    : [
        targetSeries.note,
        warehouse.note,
        quantityRule.note,
        vat.note,
        'Bu hızlı karar API öncesi kullanıcı kontrolüdür; kesin belge planı API önizlemesinden alınır.',
        'Kaynak satırların sırası korunur; kesin belge grupları API tarafından belirlenir.',
        'Ek alan 1 ve satır bilgileri aktarım payloadında korunmalıdır.',
      ];
  const userNotes: string[] = [];

  if (onlySirket24Invoice) {
    userNotes.push('DIŞTİC24 hedefi / D sipariş kuralı: hedef şirkete kayıt aktarılmayacak; yalnız SIRKET24 bağlantılı faturası oluşturulacak.');
  }

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
  if (context.mode === 'automatic' && series === 'VIN' && order.specialCode1?.trim().toLocaleUpperCase('tr-TR') === 'K' && action !== 'IRSALIYELISTIR') {
    blocks.push('WINDOFORM Özel Kod K ihraç kayıtlı işlemde irsaliye zorunludur; fatura akışı tek başına hazırlanmamalıdır.');
  }
  if (series === 'VIN' && order.specialCode1?.trim().toLocaleUpperCase('tr-TR') === 'K') {
    userNotes.push('Özel Kod K: WIN24 irsaliyesi zorunlu; WIN24 ve SIRKET24 KDV %0.');
  }
  if (context.mode === 'automatic' && series === 'NUR' && order.description.trim()) {
    userNotes.push(quantityRule.label === '1/4'
      ? '1/4 açıklaması algılandı: miktar 1/4, NURAY24 KDV %20, SIRKET24 KDV %5.'
      : 'TAM satış açıklaması algılandı: miktar tam, NURAY24 ve SIRKET24 KDV %20.');
  }
  if (context.mode === 'automatic' && sourcePrefix !== series) {
    warnings.push(`Belge prefix ${sourcePrefix}; iş kuralı ${series} olarak yorumlandı.`);
  }

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    series,
    sourcePrefix,
    action,
    actionLabel: getActionLabel(action),
    companyLabel: onlySirket24Invoice ? 'DIŞ TİCARET → ŞİRKET24 Fatura' : rule.title,
    sourceNetsisCompany: effectiveRule.sourceNetsisCompany,
    targetNetsisCompany: onlySirket24Invoice ? 'SIRKET24' : rule.targetNetsisCompany,
    targetSeries: targetSeries.value,
    seriesNote: targetSeries.note,
    targetWarehouse: warehouse.value,
    targetWarehouseLabel: warehouse.label,
    targetWarehouseLocked: warehouse.locked,
    primaryVat: vat.primaryVat,
    sirket24Vat: vat.sirket24Vat,
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
    sourceOrderNo: null,
    customer: dispatch.cariIsim || dispatch.cariKodu,
    customerCode: dispatch.cariKodu,
    date: formatDate(dispatch.tarih),
    documentDate: dispatch.tarih ?? null,
    status: operationProfile === 'disTicaret' ? 'partial' : 'open',
    route: [dispatch.tipi, dispatch.teslimCariIsim].filter(Boolean).join(' / ') || '-',
    branch: dispatch.teslimCariKodu || dispatch.cariKodu || '-',
    shipmentType,
    defaultWarehouse: '-',
    representative: dispatch.plasiyerAciklama || dispatch.plasiyerKodu || '-',
    operationProfile,
    documentType: 'irsaliye',
    hasShipment: hasSeparateShippingCustomer(dispatch.cariKodu, dispatch.teslimCariKodu),
    shippingCustomerCode: dispatch.teslimCariKodu?.trim() || null,
    shippingCustomerName: dispatch.teslimCariIsim?.trim() || null,
    specialCode1: dispatch.ozelKod1?.trim() || null,
    specialCode2: dispatch.ozelKod2?.trim() || null,
    projectCode: dispatch.projectCode?.trim() || null,
    description: dispatch.aciklama || '',
    tip: dispatch.tipi || '-',
    exportType,
  };
}

function mapDispatchLine(line: NetsisCustomerDispatchLineDto, indexInFis: number, order?: NdiOrder): NdiOrderLine {
  const remainingQuantity = Number(line.bakiye ?? 0);
  const quantity = Number(line.miktar ?? 0);
  const unitPrice = Number(line.tlFiyat && line.tlFiyat > 0 ? line.tlFiyat : (line.netFiyat ?? 0));
  const foreignUnitPrice = line.dovizFiyat ?? null;
  const currencyType = line.dovizTipi ?? null;
  const currencyRate = line.dovizKuru ?? null;
  const exchangeRate = line.dovizKuru ?? null;

  return {
    id: `${line.fisNo}::${line.stokKodu}::${indexInFis}`,
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
    lineSpecialCode1: line.stharKod1?.trim() || null,
    remainingQuantity,
    unit: line.olcuBirimi || line.olcuBr || '-',
    warehouse: line.depoKodu == null ? '' : String(line.depoKodu),
    deliveryNote: line.cariKodu || order?.customerCode || '-',
    ekalan: line.ekalan?.trim() || null,
    ekalan1: line.ekalan1?.trim() || null,
    status: remainingQuantity <= 0 ? 'waiting' : remainingQuantity < quantity ? 'partial' : 'ready',
  };
}

function mapDispatchLines(
  lines: NetsisCustomerDispatchLineDto[],
  ordersById: Map<string, NdiOrder>
): NdiOrderLine[] {
  const indexByFisNo = new Map<string, number>();

  return lines.map((line) => {
    const indexInFis = indexByFisNo.get(line.fisNo) ?? 0;
    indexByFisNo.set(line.fisNo, indexInFis + 1);
    return mapDispatchLine(line, indexInFis, ordersById.get(line.fisNo));
  });
}

function applyOrderCheck(
  order: NdiOrder,
  check?: NetsisCustomerDispatchOrderCheckDto
): NdiOrder {
  const sourceOrderNo = check?.siparisNo?.trim() || null;
  const shippingCustomerCode = check?.teslimCariKodu?.trim() || order.shippingCustomerCode || null;
  const series = getKnownSeries(sourceOrderNo || order.orderNo);
  const operationProfile: NdiOrder['operationProfile'] = series === 'NUR'
    ? 'nuray'
    : series === 'DIS'
      ? 'disTicaret'
      : series === 'SIP'
        ? 'sirket24'
        : series === 'VIN'
          ? 'windoformKapi'
          : order.operationProfile;

  return {
    ...order,
    sourceOrderNo,
    operationProfile,
    hasShipment: hasSeparateShippingCustomer(order.customerCode, shippingCustomerCode),
    shippingCustomerCode,
    description: check?.aciklama?.trim() || order.description,
    exportRefNo: check?.exportRefNo?.trim() || null,
    orderExportType: check?.exportType ?? null,
    orderTipi: check?.tipi ?? null,
  };
}

export function NdiOrderTransferPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<'pending' | 'transferred'>('pending');
  const [search, setSearch] = useState('');
  const [transferMode, setTransferMode] = useState<NdiTransferMode>('automatic');
  const [manualDocuments, setManualDocuments] = useState<NdiManualDocumentRequest[]>([]);
  const manualTarget = (manualDocuments[0]?.targetNetsisCompany as NdiManualTarget | undefined) ?? 'NURAY24';
  const manualDocumentType = manualDocuments[0]?.documentType ?? 'İrsaliye';
  const [quantityMode, setQuantityMode] = useState<NdiQuantityMode>('auto');
  const [dispatchSeries, setDispatchSeries] = useState('');
  const [invoiceSeries, setInvoiceSeries] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [selectionRuleError, setSelectionRuleError] = useState<string | null>(null);
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
  const previousLineIdsRef = useRef<Set<string>>(new Set());
  const {
    expanded: rulesPanelExpanded,
    toggle: toggleRulesPanel,
  } = useCollapsibleCardToggle();

  const dispatchesQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatches'],
    queryFn: ndiApi.getCustomerDispatches,
    staleTime: 60_000,
  });
  const ndiRulesQuery = useQuery({
    queryKey: ['ndi', 'transfer-rules'],
    queryFn: ndiApi.getNdiTransferRules,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const orders = useMemo(() => (dispatchesQuery.data ?? []).map(mapDispatchToOrder), [dispatchesQuery.data]);
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);
  const selectedPrefix = selectedOrders[0] ? getOrderPrefix(selectedOrders[0]) : '-';
  const selectedCustomerCode = selectedOrders[0]?.customerCode?.trim() ?? '';
  const selectedIrsNoList = useMemo(() => selectedOrders.map((order) => order.orderNo).join(','), [selectedOrders]);

  const orderChecksQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatch-order-checks', selectedIrsNoList],
    queryFn: () => ndiApi.getCustomerDispatchOrderChecks(selectedIrsNoList),
    enabled: selectedIrsNoList.length > 0,
    staleTime: 30_000,
  });
  const orderChecksByDocumentNo = useMemo(
    () => new Map((orderChecksQuery.data ?? []).map((check) => [check.fatirsNo, check])),
    [orderChecksQuery.data]
  );

  const transferredQuery = useQuery({
    queryKey: ['ndi', 'transferred'],
    queryFn: ndiApi.getTransferred,
    staleTime: 30_000,
  });

  const selectedOrdersForTransfer = useMemo(() => {
    return selectedOrders.map((order) => applyOrderCheck(
      order,
      orderChecksByDocumentNo.get(order.orderNo)
    ));
  }, [orderChecksByDocumentNo, selectedOrders]);
  const linesQuery = useQuery({
    queryKey: ['ndi', 'customer-dispatch-lines', selectedIrsNoList],
    queryFn: () => ndiApi.getCustomerDispatchLines(selectedIrsNoList),
    enabled: selectedIrsNoList.length > 0,
    staleTime: 30_000,
  });

  const selectedOrderLines = useMemo(
    () => mapDispatchLines(linesQuery.data ?? [], ordersById),
    [linesQuery.data, ordersById]
  );

  const lineIdsKey = useMemo(() => selectedOrderLines.map((line) => line.id).join('|'), [selectedOrderLines]);

  useEffect(() => {
    if (selectedIrsNoList.length === 0) {
      previousLineIdsRef.current = new Set();
      setSelectedLineIds((current) => (current.size === 0 ? current : new Set()));
      return;
    }

    if (!linesQuery.data) {
      return;
    }

    const currentLineIds = selectedOrderLines.map((line) => line.id);
    const previousLineIds = previousLineIdsRef.current;

    setSelectedLineIds((current) => {
      const next = new Set<string>();

      currentLineIds.forEach((lineId) => {
        const isNewlyAppeared = !previousLineIds.has(lineId);
        if (isNewlyAppeared || current.has(lineId)) {
          next.add(lineId);
        }
      });

      if (next.size === current.size && [...next].every((lineId) => current.has(lineId))) {
        return current;
      }

      return next;
    });

    previousLineIdsRef.current = new Set(currentLineIds);
  }, [lineIdsKey, linesQuery.data, selectedIrsNoList, selectedOrderLines]);

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

  const selectedLines = useMemo(
    () => selectedOrderLines.filter((line) => selectedLineIds.has(line.id)),
    [selectedOrderLines, selectedLineIds]
  );
  const selectedQuantity = useMemo(
    () => selectedLines.reduce((total, line) => total + line.remainingQuantity, 0),
    [selectedLines]
  );
  const selectedWarehouses = useMemo(
    () => Array.from(new Set(selectedOrderLines.map((line) => line.warehouse))),
    [selectedOrderLines]
  );
  const selectedShipmentTypes = useMemo(
    () => Array.from(new Set(selectedOrdersForTransfer.map((order) => order.shipmentType))),
    [selectedOrdersForTransfer]
  );
  const selectedRepresentatives = useMemo(
    () => Array.from(new Set(selectedOrdersForTransfer.map((order) => order.representative))),
    [selectedOrdersForTransfer]
  );
  const selectedSpecialCodes1 = useMemo(
    () => Array.from(new Set(
      selectedOrdersForTransfer
        .map((order) => order.specialCode1?.trim())
        .filter((value): value is string => Boolean(value))
    )),
    [selectedOrdersForTransfer]
  );
  const selectedExportRefNos = useMemo(
    () => Array.from(new Set(
      selectedOrdersForTransfer
        .map((order) => order.exportRefNo?.trim())
        .filter((value): value is string => Boolean(value))
    )),
    [selectedOrdersForTransfer]
  );
  const selectedOrderExportTypes = useMemo(
    () => Array.from(new Set(
      selectedOrdersForTransfer
        .map((order) => order.orderExportType)
        .filter((value): value is number => value != null)
    )),
    [selectedOrdersForTransfer]
  );
  const selectedOrderTypes = useMemo(
    () => Array.from(new Set(
      selectedOrdersForTransfer
        .map((order) => order.orderTipi)
        .filter((value): value is number => value != null)
    )),
    [selectedOrdersForTransfer]
  );
  const selectedProjects = useMemo(
    () => Array.from(new Set(
      selectedOrdersForTransfer
        .map((order) => order.projectCode?.trim())
        .filter((value): value is string => Boolean(value))
    )),
    [selectedOrdersForTransfer]
  );
  const decisionContext = useMemo<NdiDecisionContext>(() => ({
    mode: transferMode,
    manualTarget,
    manualDocumentType,
  }), [manualDocumentType, manualTarget, transferMode]);
  const selectedRules = useMemo(
    () => Array.from(new Map(
      selectedOrdersForTransfer.map((order) => {
        const rule = getDecisionRule(order, decisionContext);
        return [rule.id, rule] as const;
      })
    ).values()),
    [selectedOrdersForTransfer, decisionContext]
  );
  const selectedRuleIds = useMemo(() => new Set(selectedRules.map((rule) => rule.id)), [selectedRules]);
  const quarterModeAvailable = transferMode === 'manual'
    ? manualDocuments.length > 0
    : selectedRules.length > 0 && selectedRules.every((rule) => rule.id === 'nuray');

  useEffect(() => {
    if (!quarterModeAvailable && quantityMode === 'quarter') {
      setQuantityMode('full');
    }
  }, [quarterModeAvailable, quantityMode]);

  const selectedLinesByOrderNo = useMemo(() => {
    const grouped = new Map<string, NdiOrderLine[]>();
    selectedOrderLines.forEach((line) => {
      const current = grouped.get(line.orderNo) ?? [];
      current.push(line);
      grouped.set(line.orderNo, current);
    });
    return grouped;
  }, [selectedOrderLines]);
  const warehouseLabelByOrderNo = useMemo(() => {
    const labels = new Map<string, string>();
    selectedLinesByOrderNo.forEach((lines, orderNo) => {
      const warehouses = Array.from(new Set(lines.map((line) => line.warehouse).filter(Boolean)));
      labels.set(orderNo, warehouses.join(', ') || '-');
    });
    return labels;
  }, [selectedLinesByOrderNo]);
  const ruleOutcomes = useMemo(
    () => selectedOrdersForTransfer.map((order) => {
      const outcome = buildRuleOutcome(
        order,
        selectedLinesByOrderNo.get(order.orderNo) ?? [],
        quantityMode,
        decisionContext
      );
      const usesInvoiceSeries = outcome.action === 'FATURALASTIR';
      const targetSeries = resolveEffectiveTargetSeries(outcome.action, dispatchSeries, invoiceSeries);

      return {
        ...outcome,
        targetSeries: targetSeries || '-',
        seriesNote: usesInvoiceSeries
          ? `${outcome.companyLabel} fatura serisi ${targetSeries || '-'} olarak uygulanacak.`
          : `${outcome.companyLabel} irsaliye serisi ${targetSeries || '-'} olarak uygulanacak.`,
      };
    }),
    [decisionContext, dispatchSeries, invoiceSeries, quantityMode, selectedLinesByOrderNo, selectedOrdersForTransfer]
  );
  const selectedSeriesCompany = ruleOutcomes[0]?.targetNetsisCompany ?? '';
  const customerDocumentSeriesQuery = useQuery({
    queryKey: ['ndi', 'customer-document-series', selectedSeriesCompany, selectedCustomerCode],
    queryFn: () => ndiApi.getCustomerDocumentSeries(selectedSeriesCompany, selectedCustomerCode),
    enabled: transferMode === 'automatic' && selectedSeriesCompany.length > 0 && selectedCustomerCode.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const manualDocumentSeriesQueries = useQueries({
    queries: MANUAL_TARGETS.map((target) => ({
      queryKey: ['ndi', 'customer-document-series', target, selectedCustomerCode],
      queryFn: () => ndiApi.getCustomerDocumentSeries(target, selectedCustomerCode),
      enabled: transferMode === 'manual'
        && selectedCustomerCode.length > 0
        && manualDocuments.some((selection) => selection.targetNetsisCompany === target),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const manualDocumentSeriesByTarget = useMemo(
    () => new Map(MANUAL_TARGETS.map((target, index) => [
      target,
      manualDocumentSeriesQueries[index]?.data ?? [],
    ])),
    [manualDocumentSeriesQueries]
  );
  const customerDocumentSeries = useMemo(
    () => customerDocumentSeriesQuery.data ?? [],
    [customerDocumentSeriesQuery.data]
  );
  const dispatchSeriesOptions = useMemo(
    () => getDocumentSeriesOptions(customerDocumentSeries, 'İrsaliye'),
    [customerDocumentSeries]
  );
  const invoiceSeriesOptions = useMemo(
    () => getDocumentSeriesOptions(customerDocumentSeries, 'Fatura'),
    [customerDocumentSeries]
  );
  const batchAction = useMemo(() => resolveBatchAction(ruleOutcomes), [ruleOutcomes]);
  const blockedRuleCount = ruleOutcomes.reduce((total, outcome) => total + outcome.blocks.length, 0);
  const warningCount = ruleOutcomes.reduce((total, outcome) => total + outcome.warnings.length, 0);
  const selectedLinesWithoutPrice = selectedLines.filter((line) => line.unitPrice <= 0);
  const needsDispatchSeries = transferMode === 'manual'
    ? manualDocuments.some((selection) => selection.documentType === 'İrsaliye')
    : ruleOutcomes.some((outcome) => outcome.action === 'IRSALIYELISTIR');
  const needsInvoiceSeries = transferMode === 'manual'
    ? manualDocuments.some((selection) => selection.documentType === 'Fatura')
    : true;
  const hasSelectedDispatchSeries = !needsDispatchSeries || dispatchSeriesOptions.some(
    (option) => normalizeNdiSeriesInput(option.value) === dispatchSeries
  );
  const hasSelectedInvoiceSeries = !needsInvoiceSeries || invoiceSeriesOptions.some(
    (option) => normalizeNdiSeriesInput(option.value) === invoiceSeries
  );
  const hasValidManualDocuments = manualDocuments.length > 0 && manualDocuments.every((selection) => {
    const target = selection.targetNetsisCompany as NdiManualTarget;
    const options = getDocumentSeriesOptions(
      manualDocumentSeriesByTarget.get(target) ?? [],
      selection.documentType
    );
    return isValidNdiSeries(selection.targetSeries)
      && options.some((option) => option.value === selection.targetSeries);
  });
  const hasValidDocumentSeries = transferMode === 'manual'
    ? hasValidManualDocuments
    : (!needsDispatchSeries || (isValidNdiSeries(dispatchSeries) && hasSelectedDispatchSeries))
      && (!needsInvoiceSeries || (isValidNdiSeries(invoiceSeries) && hasSelectedInvoiceSeries));
  const dispatchSeriesReady = !needsDispatchSeries
    || (isValidNdiSeries(dispatchSeries) && hasSelectedDispatchSeries);
  const invoiceSeriesReady = !needsInvoiceSeries
    || (isValidNdiSeries(invoiceSeries) && hasSelectedInvoiceSeries);
  const selectedManualTargetIndexes = Array.from(new Set(manualDocuments.map((selection) =>
    MANUAL_TARGETS.indexOf(selection.targetNetsisCompany as NdiManualTarget)
  ))).filter((index) => index >= 0);
  const automaticSeriesLookupUnavailable = transferMode === 'automatic'
    && customerDocumentSeriesQuery.isError;
  const manualSeriesLookupUnavailable = transferMode === 'manual'
    && selectedManualTargetIndexes.some((index) => manualDocumentSeriesQueries[index]?.isError);
  const documentSeriesLookupUnavailable = automaticSeriesLookupUnavailable || manualSeriesLookupUnavailable;
  const documentSeriesLookupPending = transferMode === 'automatic'
    ? customerDocumentSeriesQuery.isFetching
    : selectedManualTargetIndexes.some((index) => manualDocumentSeriesQueries[index]?.isFetching);
  const documentSeriesErrorMessage = transferMode === 'automatic'
    ? customerDocumentSeriesQuery.error instanceof Error
      ? customerDocumentSeriesQuery.error.message
      : 'Cari belge serileri doğrulanamadı.'
    : selectedManualTargetIndexes
      .map((index) => manualDocumentSeriesQueries[index]?.error)
      .find((error): error is Error => error instanceof Error)?.message
      ?? 'Seçilen hedef şirketin cari belge serileri doğrulanamadı.';
  const canPrepareSelectedLines = selectedLines.length > 0
    && blockedRuleCount === 0
    && selectedLinesWithoutPrice.length === 0
    && hasValidDocumentSeries;
  const prepareDisabled = selectedLines.length === 0
    || linesQuery.isFetching
    || orderChecksQuery.isFetching
    || isPreparingTransfer
    || documentSeriesLookupPending
    || documentSeriesLookupUnavailable;

  const retryDocumentSeries = (): void => {
    if (transferMode === 'automatic') {
      void customerDocumentSeriesQuery.refetch();
      return;
    }

    void Promise.all(selectedManualTargetIndexes.map((index) =>
      manualDocumentSeriesQueries[index]?.refetch()
    ));
  };

  const toggleOrder = async (order: NdiOrder): Promise<void> => {
    if (checkingOrderId !== null) {
      return;
    }

    if (selectedOrderIds.has(order.id)) {
      setSelectionRuleError(null);
      setPreparedTransfer(null);
      setSuccessDialogTransfer(null);
      setTransferResult(null);
      setTransferResultDialog(null);
      setSendError(null);
      setPrepareAttempted(false);
      setPrepareError(null);
      setSelectedOrderIds((current) => {
        const next = new Set(current);
        next.delete(order.id);
        return next;
      });
      return;
    }

    const selectedCustomer = selectedOrders[0]?.customerCode?.trim();
    if (selectedCustomer
      && selectedCustomer.localeCompare(order.customerCode.trim(), undefined, { sensitivity: 'accent' }) !== 0) {
      setSelectionRuleError(`Bu irsaliye seçilemez. Aktif grupta yalnızca ${selectedCustomer} carisine ait irsaliyeler kullanılabilir.`);
      return;
    }

    setCheckingOrderId(order.id);
    setSelectionRuleError(null);

    try {
      const candidateOrders = [...selectedOrders, order];
      const compatibility = await ndiApi.checkNdiSelection({
        mode: transferMode,
        sourceDocumentNos: candidateOrders.map((item) => item.orderNo),
      });
      if (!compatibility.isCompatible) {
        setSelectionRuleError(
          compatibility.blockingReasons[0]
          ?? `${order.orderNo} seçilemez. Seçili irsaliyeler aynı NDI aktarım grubunda işlenemiyor.`
        );
        return;
      }

      setPreparedTransfer(null);
      setSuccessDialogTransfer(null);
      setTransferResult(null);
      setTransferResultDialog(null);
      setSendError(null);
      setPrepareAttempted(false);
      setPrepareError(null);
      setSelectedOrderIds((current) => new Set(current).add(order.id));
    } catch (error) {
      setSelectionRuleError(
        `Bu irsaliyenin NDI kuralı doğrulanamadı ve seçim güvenli şekilde durduruldu. ${error instanceof Error ? error.message : 'Sipariş kontrol servisi yanıt vermedi.'}`
      );
    } finally {
      setCheckingOrderId(null);
    }
  };

  useEffect(() => {
    setDispatchSeries('');
    setInvoiceSeries('');
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
  }, [selectedCustomerCode, selectedSeriesCompany]);

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
    setTransferMode('automatic');
    setManualDocuments([]);
    setQuantityMode('auto');
    setSelectedOrderIds(new Set());
    setSelectedLineIds(new Set());
    setCheckingOrderId(null);
    setSelectionRuleError(null);
    setPrepareAttempted(false);
    setPrepareError(null);
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    void dispatchesQuery.refetch();
  };

  const changeQuantityMode = (mode: NdiQuantityMode) => {
    setQuantityMode(mode);
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setPrepareAttempted(false);
    setPrepareError(null);
  };

  const changeTransferMode = (mode: NdiTransferMode) => {
    setTransferMode(mode);
    setSelectionRuleError(null);
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setPrepareAttempted(false);
    setPrepareError(null);
  };

  const toggleManualDocument = (target: NdiManualTarget, documentType: NdiManualDocumentType) => {
    setManualDocuments((current) => {
      const exists = current.some((selection) =>
        selection.targetNetsisCompany === target && selection.documentType === documentType);
      if (exists) {
        return current.filter((selection) =>
          selection.targetNetsisCompany !== target || selection.documentType !== documentType);
      }

      return [...current, { targetNetsisCompany: target, documentType, targetSeries: '' }];
    });
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setPrepareAttempted(false);
    setPrepareError(null);
  };

  const changeManualDocumentSeries = (
    target: NdiManualTarget,
    documentType: NdiManualDocumentType,
    value: string
  ) => {
    const normalizedValue = normalizeNdiSeriesInput(value);
    setManualDocuments((current) => current.map((selection) =>
      selection.targetNetsisCompany === target && selection.documentType === documentType
        ? { ...selection, targetSeries: normalizedValue }
        : selection));
    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setPrepareAttempted(false);
    setPrepareError(null);
  };

  const changeDocumentSeries = (type: 'dispatch' | 'invoice', value: string) => {
    const normalizedValue = normalizeNdiSeriesInput(value);
    if (type === 'dispatch') {
      setDispatchSeries(normalizedValue);
    } else {
      setInvoiceSeries(normalizedValue);
    }

    setPreparedTransfer(null);
    setSuccessDialogTransfer(null);
    setTransferResult(null);
    setTransferResultDialog(null);
    setSendError(null);
    setPrepareAttempted(false);
    setPrepareError(null);
  };

  const reopenTransferredRecord = async (record: NdiTransferredRecordDto) => {
    const confirmed = window.confirm(
      `${record.sourceDocumentNo} belgesini yeniden işleme almak istiyor musunuz? Belge ana listeye dönecek; kısmi aktarımda daha önce oluşan belge tekrar gönderilmeyecek.`
    );
    if (!confirmed) {
      return;
    }

    await ndiApi.reopenTransfer(record.id);
    await Promise.all([transferredQuery.refetch(), dispatchesQuery.refetch()]);
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
      const outcomeByOrderNo = new Map(ruleOutcomes.map((outcome) => [outcome.orderNo, outcome]));

      const preparedLines = selectedLines.map((line) => {
        const outcome = outcomeByOrderNo.get(line.orderNo);
        const lineRatio = outcome && outcome.requestedQuantity > 0
          ? outcome.transferQuantity / outcome.requestedQuantity
          : 1;
        const lineIdParts = line.id.split('::');
        const sourceLineNo = Number(lineIdParts[lineIdParts.length - 1] ?? 0) + 1;

        return {
          id: line.id,
          sourceLineNo,
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
          lineSpecialCode1: line.lineSpecialCode1,
          unit: line.unit,
          sourceWarehouse: line.warehouse,
          targetWarehouse: outcome?.targetWarehouseLocked ? outcome.targetWarehouse : line.warehouse,
          targetVat: outcome?.primaryVat ?? null,
          ekalan: line.ekalan,
          ekalan1: line.ekalan1,
        };
      });

      const createdDocuments: NdiPreparedDocument[] = selectedOrdersForTransfer.map((order) => {
        const outcome = outcomeByOrderNo.get(order.orderNo);
        const firstManualDocument = manualDocuments[0];
        const action = transferMode === 'manual' && firstManualDocument
          ? firstManualDocument.documentType === 'Fatura' ? 'FATURALASTIR' : 'IRSALIYELISTIR'
          : outcome?.action ?? resolvePrimaryAction(order, decisionContext);
        const documentType: NdiPreparedDocument['documentType'] = transferMode === 'manual' && firstManualDocument
          ? firstManualDocument.documentType
          : action === 'FATURALASTIR' ? 'Fatura' : 'İrsaliye';
        const targetSeries = transferMode === 'manual' && firstManualDocument
          ? firstManualDocument.targetSeries
          : outcome?.targetSeries ?? resolveEffectiveTargetSeries(action, dispatchSeries, invoiceSeries);

        return {
          sourceDocumentNo: order.orderNo,
          sourceOrderNo: order.sourceOrderNo,
          businessRule: transferMode === 'automatic'
            ? outcome?.series ?? getBusinessSeries(order)
            : null,
          sourceNetsisCompany: outcome?.sourceNetsisCompany ?? 'SIRKET24',
          targetNetsisCompany: transferMode === 'manual' && firstManualDocument
            ? firstManualDocument.targetNetsisCompany
            : outcome?.targetNetsisCompany ?? SERIES_CONFIG[getBusinessSeries(order)].netsisCompany,
          targetSeries,
          documentType,
          sourceType: order.tip,
          hasShipment: order.hasShipment,
          shippingCustomerCode: order.shippingCustomerCode,
          specialCode1: order.specialCode1,
          specialCode2: order.specialCode2,
          exportRefNo: order.exportRefNo,
          orderExportType: order.orderExportType,
          orderTipi: order.orderTipi,
          projectCode: order.projectCode,
          followUpNote: transferMode === 'manual'
            ? 'Manuel seçimde yalnız seçilen hedef belge oluşturulacak; otomatik takip faturası oluşturulmayacak.'
            : outcome?.targetNetsisCompany === 'SIRKET24'
              ? 'Kaynak irsaliyeler yalnız ŞİRKET24 bağlantılı faturasında birleştirilecek.'
              : 'Hedef belge ayrıca faturalaştırılmayacak; kaynak ŞİRKET24 irsaliyeleri bağlantılı tek faturada birleştirilecek.',
          customerCode: order.customerCode,
          customerName: order.customer,
          description: order.description,
          date: order.documentDate,
          lineCount: preparedLines.filter((line) => line.orderNo === order.orderNo).length,
        };
      });

      const transfer: NdiPreparedTransfer = {
        actionLabel: transferMode === 'manual'
          ? `${manualDocuments.length} manuel hedef belge oluştur`
          : batchAction.action ? getActionLabel(batchAction.action) : 'Uyumluluk gruplarına göre oluştur',
        mode: transferMode,
        dispatchSeries,
        invoiceSeries,
        quantityMode,
        manualDocuments: transferMode === 'manual' ? manualDocuments : [],
        sourceNetsisCompanies: Array.from(new Set(ruleOutcomes.map((outcome) => outcome.sourceNetsisCompany))),
        targetNetsisCompanies: transferMode === 'manual'
          ? Array.from(new Set(manualDocuments.map((selection) => selection.targetNetsisCompany)))
          : Array.from(new Set(ruleOutcomes.map((outcome) => outcome.targetNetsisCompany))),
        documentNos: selectedOrdersForTransfer.map((order) => order.orderNo),
        createdDocuments,
        lineCount: preparedLines.length,
        totalSourceQuantity: preparedLines.reduce((total, line) => total + line.sourceQuantity, 0),
        totalTransferQuantity: preparedLines.reduce((total, line) => total + line.transferQuantity, 0),
        targetDocumentGroupCount: 0,
        sirket24InvoiceGroupCount: 0,
        previewDocuments: [],
        lines: preparedLines,
        warnings: ruleOutcomes.flatMap((outcome) => outcome.warnings),
      };
      const apiPreview = await ndiApi.previewNdiTransfer(buildNdiTransferRequest(transfer));
      if (apiPreview.documents.length === 0) {
        throw new Error('API geçerli bir NDI belge planı döndürmedi. Netsis aktarımı başlatılmadı.');
      }

      transfer.targetDocumentGroupCount = apiPreview.targetDocumentGroupCount;
      transfer.sirket24InvoiceGroupCount = apiPreview.sirket24InvoiceGroupCount;
      transfer.previewDocuments = apiPreview.documents;
      transfer.sourceNetsisCompanies = Array.from(new Set(
        apiPreview.documents.map((document) => document.sourceNetsisCompany)
      ));
      transfer.targetNetsisCompanies = Array.from(new Set(
        apiPreview.documents.map((document) => document.targetNetsisCompany)
      ));
      transfer.warnings = Array.from(new Set([...transfer.warnings, ...apiPreview.warnings]));

      setPreparedTransfer(transfer);
      setSuccessDialogTransfer(transfer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NDI aktarım önizlemesi hazırlanamadı.';
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
      const result = await ndiApi.createNdiTransfer(buildNdiTransferRequest(transfer));

      setTransferResult(result);
      setTransferResultDialog(result);
      setSuccessDialogTransfer(null);
      if (result.createdDocuments.length > 0) {
        setSelectedOrderIds(new Set());
        setSelectedLineIds(new Set());
        setPreparedTransfer(null);
        await Promise.all([dispatchesQuery.refetch(), transferredQuery.refetch()]);
      }
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
                Otomatik mod kaynak grubunu izler; manuel modda hedef şirket ve izin verilen belge türü kullanıcı tarafından seçilir.
              </p>
            </div>

            <NdiConnectionTestDialog />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <MetricPill label="Grup" value={`${selectedPrefix} / ${selectedOrders.length} belge`} />
              <MetricPill label="Seçili Kalem" value={String(selectedLines.length)} />
              <MetricPill label="Miktar" value={numberFormatter.format(selectedQuantity)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-1 border-b border-slate-300 bg-[var(--crm-app-panel)] px-4 pt-3 dark:border-white/20 md:px-6">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`border-b-2 px-4 py-3 text-sm font-black ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
        >
          İrsaliye Listesi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transferred')}
          className={`border-b-2 px-4 py-3 text-sm font-black ${activeTab === 'transferred' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
        >
          Aktarılanlar
        </button>
      </div>

      {activeTab === 'transferred' ? (
        <TransferredRecordsPanel
          records={transferredQuery.data ?? []}
          isLoading={transferredQuery.isLoading}
          isError={transferredQuery.isError}
          onRefresh={() => void transferredQuery.refetch()}
          onReopen={(record) => void reopenTransferredRecord(record)}
        />
      ) : (
      <main className="grid w-full items-start gap-4 px-4 pb-5 pt-4 md:px-6 xl:grid-cols-[430px_1fr]">
        <section className="flex h-[1050px] flex-col overflow-hidden rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] shadow-sm">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-black">İrsaliyeler</h2>
                <p className="text-xs font-semibold text-[var(--crm-app-text-muted)]">
                  {transferMode === 'manual'
                    ? 'Aynı cariye ait kaynak irsaliyeleri seçin; uyumlu kayıtlar tek belgede, diğerleri ayrı gruplarda oluşturulur.'
                    : 'Aynı cari ve aynı NDI kuralına ait kaynak irsaliyeleri seçin.'}
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-b border-slate-300 dark:border-white/20" />

          <div className="shrink-0 px-4 py-4">
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
            {selectionRuleError ? (
              <div className="mt-3 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{selectionRuleError}</span>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
                const orderCheck = orderChecksByDocumentNo.get(order.orderNo);

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => void toggleOrder(order)}
                    disabled={checkingOrderId !== null}
                    aria-busy={checkingOrderId === order.id}
                    className={`grid w-full grid-cols-[30px_1fr_auto] gap-3 rounded-lg border p-3 text-left transition ${
                      isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] hover:border-primary/40'
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    <div
                      className={`mt-1 flex h-7 w-7 items-center justify-center rounded-md border ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] text-[var(--crm-app-text-muted)]'
                      }`}
                    >
                      {checkingOrderId === order.id
                        ? <Loader2 size={17} className="animate-spin" />
                        : isSelected ? <CheckCircle2 size={17} /> : <Circle size={17} />}
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
                          <Truck size={14} />
                          <span>
                            Sevk Carisi: {order.shippingCustomerName || order.shippingCustomerCode || '-'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Warehouse size={14} /> {warehouseLabelByOrderNo.get(order.orderNo) ?? order.defaultWarehouse}
                        </span>
                        <span className="text-right">
                          {order.shipmentType} · Özel Kod 1: {order.specialCode1 || '-'}
                        </span>
                        {isSelected && orderCheck ? (
                          <span className="col-span-2">
                            Sipariş üst bilgisi: EXPORTREFNO {orderCheck.exportRefNo || '-'} · EXPORTTYPE {orderCheck.exportType ?? '-'} · TIPI {orderCheck.tipi ?? '-'}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 rounded-md bg-[var(--crm-app-panel-muted)] px-2 py-1 text-[11px] font-bold text-[var(--crm-app-text-muted)]">
                        {transferMode === 'manual'
                          ? 'Manuel modda kaynak seri hedef şirketi kısıtlamaz.'
                          : 'İlk 3 karakteri aynı irsaliyeler birlikte seçilebilir.'}
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
                  {transferMode === 'manual' ? 'Manuel seçim' : `${selectedPrefix} grubu`} · {selectedOrders.length} irsaliye
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
              <InfoChip
                icon={<ShieldCheck size={15} />}
                label="Seçim Kuralı"
                value={transferMode === 'manual' ? `Manuel: ${manualDocuments.length} hedef belge` : `Otomatik prefix: ${selectedPrefix}`}
              />
              <InfoChip icon={<Warehouse size={15} />} label="Depolar" value={selectedWarehouses.join(', ') || '-'} />
              <InfoChip icon={<Truck size={15} />} label="Sevkiyat tipi" value={selectedShipmentTypes.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="Sorumlu" value={selectedRepresentatives.join(', ') || '-'} />
              <InfoChip icon={<ShieldCheck size={15} />} label="Özel Kod 1" value={selectedSpecialCodes1.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="EXPORTREFNO" value={selectedExportRefNos.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="EXPORTTYPE" value={selectedOrderExportTypes.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="TIPI" value={selectedOrderTypes.join(', ') || '-'} />
              <InfoChip icon={<FileText size={15} />} label="Proje" value={selectedProjects.join(', ') || '-'} />
              <InfoChip
                icon={<PackageCheck size={15} />}
                label="Netsis Şirketi"
                value={
                  transferMode === 'manual' && manualDocuments.length > 0
                    ? `SIRKET24 -> ${Array.from(new Set(manualDocuments.map((selection) => selection.targetNetsisCompany))).join(', ')}`
                    : ruleOutcomes.length > 0
                    ? `${Array.from(new Set(ruleOutcomes.map((outcome) => outcome.sourceNetsisCompany))).join(', ')} -> ${Array.from(new Set(ruleOutcomes.map((outcome) => outcome.targetNetsisCompany))).join(', ')}`
                    : '-'
                }
              />
              </div>

            <div className="mt-3 grid gap-3 rounded-lg border border-slate-300 bg-[var(--crm-app-panel)] p-3 dark:border-white/20 lg:grid-cols-[auto_1fr_1fr]">
              <div>
                <div className="text-xs font-black uppercase text-[var(--crm-app-text-muted)]">İşlem modu</div>
                <div className="mt-2 inline-flex rounded-md border border-slate-300 bg-[var(--crm-app-panel-muted)] p-1 dark:border-white/20">
                  {([
                    ['automatic', 'Otomatik'],
                    ['manual', 'Manuel'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeTransferMode(mode)}
                      className={`min-w-24 rounded px-3 py-2 text-xs font-black transition ${transferMode === mode ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="text-xs font-black uppercase text-[var(--crm-app-text-muted)]">
                  {transferMode === 'manual' ? 'Manuel hedef planı' : 'Otomatik karar motoru'}
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {transferMode === 'manual'
                    ? 'Aşağıdaki firma kartlarından oluşturulacak irsaliye ve faturaları ayrı ayrı işaretleyin.'
                    : 'Hedef şirket ve belge türü kaynak sipariş kuralına göre otomatik belirlenir.'}
                </p>
              </div>
            </div>

            {documentSeriesLookupUnavailable ? (
              <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <AlertCircle size={17} /> Belge serileri doğrulanamadı
                    </div>
                    <p className="mt-1 break-words text-xs font-bold">{documentSeriesErrorMessage}</p>
                    <p className="mt-1 text-xs font-semibold opacity-80">
                      Yanlış seriyle Netsis kaydı oluşmaması için aktarım geçici olarak durduruldu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={retryDocumentSeries}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    <RefreshCw size={14} /> Tekrar dene
                  </button>
                </div>
              </div>
            ) : null}

            {transferMode === 'manual' ? (
              <div className="mt-3 grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
                {MANUAL_TARGETS.map((target, targetIndex) => {
                  const query = manualDocumentSeriesQueries[targetIndex];
                  const rows = manualDocumentSeriesByTarget.get(target) ?? [];
                  return (
                    <div key={target} className="rounded-lg border border-slate-300 bg-[var(--crm-app-panel)] p-3 dark:border-white/20">
                      <div className="flex items-center gap-2 text-sm font-black text-foreground">
                        <Building2 size={16} className="text-primary" /> {target === 'DISTIC24' ? 'DIŞTİC24' : target}
                      </div>
                      <div className="mt-3 space-y-3">
                        {(['İrsaliye', 'Fatura'] as const).map((documentType) => {
                          const selection = manualDocuments.find((item) =>
                            item.targetNetsisCompany === target && item.documentType === documentType);
                          const options = getDocumentSeriesOptions(rows, documentType);
                          const selected = Boolean(selection);
                          return (
                            <div key={documentType} className={`rounded-md border p-2 ${selected ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10'}`}>
                              <button
                                type="button"
                                onClick={() => toggleManualDocument(target, documentType)}
                                className="flex w-full items-center justify-between gap-2 text-left"
                              >
                                <span className="flex items-center gap-2 text-xs font-black">
                                  {documentType === 'İrsaliye' ? <Truck size={15} /> : <FileText size={15} />}
                                  {documentType}
                                </span>
                                {selected ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} className="text-muted-foreground" />}
                              </button>
                              {selected ? (
                                <div className="mt-2">
                                  <Combobox
                                    options={options}
                                    value={selection?.targetSeries ?? ''}
                                    onValueChange={(value) => changeManualDocumentSeries(target, documentType, value)}
                                    placeholder={`${documentType} serisi seçin`}
                                    emptyText={query?.isError ? 'Seriler alınamadı.' : 'Uygun seri bulunamadı.'}
                                    disabled={!selectedCustomerCode || query?.isError}
                                    isLoading={query?.isFetching ?? false}
                                    loadingText="Seriler yükleniyor..."
                                    searchable={false}
                                    className="h-10 text-xs font-black"
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className={`rounded-lg border bg-[var(--crm-app-panel)] p-3 ${prepareAttempted && needsDispatchSeries && (!isValidNdiSeries(dispatchSeries) || !hasSelectedDispatchSeries) ? 'border-red-400' : 'border-slate-300 dark:border-white/20'}`}>
                <span className="flex items-center gap-2 text-xs font-black uppercase text-[var(--crm-app-text-muted)]">
                  <Truck size={15} /> İrsaliye Belge Serisi
                </span>
                <div className="mt-2">
                  <Combobox
                    options={dispatchSeriesOptions}
                    value={dispatchSeries}
                    onValueChange={(value) => changeDocumentSeries('dispatch', value)}
                    placeholder="İrsaliye tipi ve serisi seçin"
                    emptyText={
                      customerDocumentSeriesQuery.isError
                        ? 'Cari belge serileri alınamadı. Tekrar deneyin.'
                        : selectedCustomerCode
                          ? 'İrsaliye serisi bulunamadı.'
                          : 'Önce bir irsaliye seçin.'
                    }
                    disabled={!selectedCustomerCode || !needsDispatchSeries || customerDocumentSeriesQuery.isError}
                    isLoading={customerDocumentSeriesQuery.isFetching}
                    loadingText="Seriler yükleniyor..."
                    searchable={false}
                    className="h-11 font-black"
                  />
                </div>
                <span className="mt-2 block text-xs font-semibold text-[var(--crm-app-text-muted)]">
                  {!needsDispatchSeries
                    ? 'Seçilen akış hedef irsaliye oluşturmadığı için irsaliye serisi kullanılmayacak.'
                    : selectedCustomerCode
                    ? `${selectedSeriesCompany} · Fonksiyondan gelen irsaliye tipi ve serisi seçilir`
                    : 'Önce bir irsaliye seçin.'}
                </span>
              </div>

              <div className={`rounded-lg border bg-[var(--crm-app-panel)] p-3 ${prepareAttempted && needsInvoiceSeries && (!isValidNdiSeries(invoiceSeries) || !hasSelectedInvoiceSeries) ? 'border-red-400' : 'border-slate-300 dark:border-white/20'}`}>
                <span className="flex items-center gap-2 text-xs font-black uppercase text-[var(--crm-app-text-muted)]">
                  <FileText size={15} /> Fatura Belge Serisi
                </span>
                <div className="mt-2">
                  <Combobox
                    options={invoiceSeriesOptions}
                    value={invoiceSeries}
                    onValueChange={(value) => changeDocumentSeries('invoice', value)}
                    placeholder="E-fatura tipi ve serisi seçin"
                    emptyText={
                      customerDocumentSeriesQuery.isError
                        ? 'Cari belge serileri alınamadı. Tekrar deneyin.'
                        : selectedCustomerCode
                          ? 'Fatura serisi bulunamadı.'
                          : 'Önce bir irsaliye seçin.'
                    }
                    disabled={!selectedCustomerCode || !needsInvoiceSeries || customerDocumentSeriesQuery.isError}
                    isLoading={customerDocumentSeriesQuery.isFetching}
                    loadingText="Seriler yükleniyor..."
                    searchable={false}
                    className="h-11 font-black"
                  />
                </div>
                <span className="mt-2 block text-xs font-semibold text-[var(--crm-app-text-muted)]">
                  {!needsInvoiceSeries
                    ? 'Seçilen manuel akış yalnız irsaliye oluşturduğu için fatura serisi kullanılmayacak.'
                    : customerDocumentSeriesQuery.isError
                    ? 'Cari belge serileri alınamadı. Tekrar deneyin.'
                    : 'Fonksiyondan gelen e-fatura durumu, belge tipi ve seri gösterilir.'}
                </span>
              </div>
            </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-300 bg-[var(--crm-app-panel)] p-3 dark:border-white/20">
              <div>
                <div className="text-xs font-black uppercase text-[var(--crm-app-text-muted)]">Aktarım miktarı</div>
                <div className="mt-1 text-sm font-bold text-foreground">Seçim satır miktarına doğrudan uygulanır.</div>
              </div>
              <div className="inline-flex rounded-md border border-slate-300 bg-[var(--crm-app-panel-muted)] p-1 dark:border-white/20">
                {([
                  ['auto', 'Sipariş Kuralı'],
                  ['full', 'Tam'],
                  ['quarter', '1/4'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => changeQuantityMode(mode)}
                    disabled={mode === 'quarter' && !quarterModeAvailable}
                    title={mode === 'quarter' && !quarterModeAvailable ? '1/4 aktarım yalnızca NURAY belgelerinde kullanılabilir.' : undefined}
                    className={`min-w-20 rounded px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${quantityMode === mode ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-300 dark:border-white/20 bg-[var(--crm-app-panel)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--crm-app-text-muted)]">
                    <SlidersHorizontal size={15} /> {transferMode === 'manual' ? 'Manuel Belge Planı' : 'Uygulanan İşlem Kuralları'}
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {transferMode === 'manual'
                      ? `${manualDocuments.length} hedef belge işaretlendi.`
                      : selectedRules.length === 1
                        ? `Aktif çalışacak kural: ${selectedRules[0].title} · ${batchAction.hint}`
                        : 'İrsaliye seçildiğinde aktif çalışacak NDI kuralı burada gösterilir.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {transferMode === 'manual' ? (
                    <RuleBadge tone="info" label={`${manualDocuments.length} manuel belge`} />
                  ) : batchAction.mixed ? (
                    <RuleBadge tone="info" label="Ayrı belge grupları" />
                  ) : batchAction.action ? (
                    <RuleBadge tone="info" label={getActionLabel(batchAction.action)} />
                  ) : (
                    <RuleBadge tone="info" label="Belge seçin" />
                  )}
                  {blockedRuleCount > 0 ? <RuleBadge tone="danger" label={`${blockedRuleCount} blok`} /> : <RuleBadge tone="success" label="Blok yok" />}
                  {warningCount > 0 ? <RuleBadge tone="warn" label={`${warningCount} uyarı`} /> : <RuleBadge tone="success" label="Uyarı yok" />}
                  <RuleBadge tone="success" label="Ek alan aktarılır" />
                  <ExpandToggleButton expanded={rulesPanelExpanded} onToggle={toggleRulesPanel} />
                </div>
              </div>
              {rulesPanelExpanded ? (
                transferMode === 'automatic' ? (
                  <SeriesGuide
                    activeRuleIds={selectedRuleIds}
                    ruleOutcomes={ruleOutcomes}
                    dispatchSeriesReady={dispatchSeriesReady}
                    invoiceSeriesReady={invoiceSeriesReady}
                    apiRules={ndiRulesQuery.data ?? []}
                    rulesLoading={ndiRulesQuery.isLoading}
                    rulesError={ndiRulesQuery.isError}
                  />
                ) : (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100">
                    <div className="text-xs font-black uppercase tracking-[0.14em]">Manuel aktarım</div>
                    <p className="mt-2 text-sm font-bold">
                      {manualDocuments.length > 0
                        ? `İşaretlenen belgeler: ${manualDocuments.map((selection) => `${selection.targetNetsisCompany} ${selection.documentType}`).join(', ')}.`
                        : 'En az bir firma ve belge türü işaretleyin.'}
                      {' '}Otomatik şirket yönlendirmesi ve takip faturası çalışmaz.
                    </p>
                  </div>
                )
              ) : null}
              {prepareAttempted && !canPrepareSelectedLines ? (
                <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                    <AlertCircle size={16} /> Seçili kalemler henüz hazırlanamaz
                  </div>
                  <div className="mt-2 space-y-1">
                    {selectedLines.length === 0 ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">En az bir satır seçilmelidir.</div>
                    ) : null}
                    {transferMode === 'manual' && manualDocuments.length === 0 ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">En az bir hedef firma ve belge türü işaretlenmelidir.</div>
                    ) : null}
                    {transferMode === 'manual' && manualDocuments.some((selection) => !isValidNdiSeries(selection.targetSeries)) ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">İşaretlenen her belge için fonksiyondan bir seri seçilmelidir.</div>
                    ) : null}
                    {transferMode === 'manual'
                      && manualDocuments.length > 0
                      && manualDocuments.every((selection) => isValidNdiSeries(selection.targetSeries))
                      && !hasValidManualDocuments ? (
                        <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">Seçilen seriler ilgili firmanın cari belge serileri seçeneklerinden gelmelidir.</div>
                      ) : null}
                    {transferMode === 'automatic' && needsDispatchSeries && !isValidNdiSeries(dispatchSeries) ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">İrsaliye belge serisi tam 3 harf veya rakam olmalıdır.</div>
                    ) : null}
                    {transferMode === 'automatic' && needsDispatchSeries && isValidNdiSeries(dispatchSeries) && !hasSelectedDispatchSeries ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">İrsaliye serisi cari belge serileri fonksiyonundan gelen seçeneklerden seçilmelidir.</div>
                    ) : null}
                    {transferMode === 'automatic' && needsInvoiceSeries && !isValidNdiSeries(invoiceSeries) ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">Fatura belge serisi tam 3 harf veya rakam olmalıdır.</div>
                    ) : null}
                    {transferMode === 'automatic' && needsInvoiceSeries && isValidNdiSeries(invoiceSeries) && !hasSelectedInvoiceSeries ? (
                      <div className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#7f1d1d]">Fatura serisi cari belge serileri fonksiyonundan gelen seçeneklerden seçilmelidir.</div>
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
                    Hazırlanan gerçek aktarım payloadı API karar motorunda doğrulanıyor. Onaylı önizleme gelmeden Netsis gönderimi açılamaz.
                  </p>
                </div>
              ) : null}
              {prepareError ? (
                <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
                    <AlertCircle size={16} /> Önizleme hazırlanamadı
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
                        <td className={NDI_TABLE_CELL}>
                          <div className="font-bold text-foreground">{line.stockName}</div>
                          {line.lineSpecialCode1 && (
                            <div className="mt-1 text-xs font-bold text-[var(--crm-app-text-muted)]">
                              Satır Kod1: {line.lineSpecialCode1}
                            </div>
                          )}
                        </td>
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
      )}
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

export function NdiTransferredRecordsPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reopeningRecordId, setReopeningRecordId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const transferredQuery = useQuery({
    queryKey: ['ndi', 'transferred'],
    queryFn: ndiApi.getTransferred,
    staleTime: 30_000,
  });

  const records = useMemo(() => transferredQuery.data ?? [], [transferredQuery.data]);
  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');

    return records.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValues = [
        record.sourceDocumentNo,
        record.sourceOrderNo,
        record.sourceNetsisCompany,
        record.customerCode,
        record.customerName,
        ...record.documents.flatMap((document) => [
          document.targetNetsisCompany,
          document.documentType,
          document.targetSeries,
          document.netsisDocumentNo,
        ]),
      ];

      return searchableValues.some((value) => value?.toLocaleLowerCase('tr-TR').includes(normalizedSearch));
    });
  }, [records, search, statusFilter]);

  const transferredCount = records.filter((record) => record.status === 'Transferred').length;
  const partialCount = records.filter((record) => record.status === 'PartiallyTransferred').length;
  const documentCount = records.reduce((total, record) => total + record.documents.length, 0);

  const reopenTransferredRecord = async (record: NdiTransferredRecordDto) => {
    const confirmed = window.confirm(
      `${record.sourceDocumentNo} belgesini yeniden işleme almak istiyor musunuz? Kısmi aktarımda yalnız başarısız belge yeniden denenecektir.`
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);
    setReopeningRecordId(record.id);
    try {
      await ndiApi.reopenTransfer(record.id);
      await transferredQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Belge yeniden işleme alınamadı.');
    } finally {
      setReopeningRecordId(null);
    }
  };

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-[var(--crm-app-background)] text-foreground md:-mx-6 md:-mt-6">
      <header className="border-b border-slate-300 bg-[var(--crm-app-panel)] px-4 py-5 dark:border-white/20 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageCheck size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase text-primary">NDI</div>
              <h1 className="mt-1 text-2xl font-black">Aktarılan Belgeler</h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-[var(--crm-app-text-muted)]">
                Netsis aktarım geçmişini, oluşan irsaliye ve faturaları, hedef firmaları ve kalem ayrıntılarını inceleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void transferredQuery.refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-black text-foreground hover:bg-[var(--crm-app-panel-muted)] dark:border-white/20"
          >
            <RefreshCw size={17} className={transferredQuery.isFetching ? 'animate-spin' : ''} />
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricPill label="Kayıt" value={String(records.length)} />
          <MetricPill label="Aktarıldı" value={String(transferredCount)} />
          <MetricPill label="Kısmi" value={String(partialCount)} />
          <MetricPill label="Netsis Belgesi" value={String(documentCount)} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-[var(--crm-app-panel)] px-4 py-3 dark:border-white/20 md:px-6">
        <label className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Belge, sipariş, müşteri veya firma ara..."
            className="h-10 w-full rounded-md border border-slate-300 bg-[var(--crm-app-panel)] pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary dark:border-white/20"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Aktarım durumu"
          className="h-10 min-w-48 rounded-md border border-slate-300 bg-[var(--crm-app-panel)] px-3 text-sm font-bold outline-none focus:border-primary dark:border-white/20"
        >
          <option value="all">Tüm durumlar</option>
          <option value="Transferred">Aktarıldı</option>
          <option value="PartiallyTransferred">Kısmi aktarıldı</option>
          <option value="Processing">Aktarılıyor</option>
          <option value="RetryPending">Yeniden deneme bekliyor</option>
          <option value="Reopened">Yeniden işleme alındı</option>
        </select>
      </div>

      {actionError ? (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 md:mx-6">
          <AlertCircle size={18} /> {actionError}
        </div>
      ) : null}

      <TransferredRecordsPanel
        records={filteredRecords}
        isLoading={transferredQuery.isLoading}
        isError={transferredQuery.isError}
        onRefresh={() => void transferredQuery.refetch()}
        onReopen={(record) => void reopenTransferredRecord(record)}
        reopeningRecordId={reopeningRecordId}
        showHeader={false}
      />
    </div>
  );
}

function TransferredRecordsPanel({
  records,
  isLoading,
  isError,
  onRefresh,
  onReopen,
  reopeningRecordId = null,
  showHeader = true,
}: {
  records: NdiTransferredRecordDto[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  onReopen: (record: NdiTransferredRecordDto) => void;
  reopeningRecordId?: number | null;
  showHeader?: boolean;
}): ReactElement {
  const statusLabels: Record<string, string> = {
    Processing: 'Aktarılıyor',
    Transferred: 'Aktarıldı',
    PartiallyTransferred: 'Kısmi aktarıldı',
    RetryPending: 'Yeniden deneme bekliyor',
    Reopened: 'Yeniden işleme alındı',
  };

  return (
    <main className="w-full px-4 pb-6 pt-4 md:px-6">
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-[var(--crm-app-panel)] shadow-sm dark:border-white/20">
        {showHeader ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-4 dark:border-white/20">
          <div>
            <h2 className="text-lg font-black">Aktarılmış Belgeler Rehberi</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--crm-app-text-muted)]">
              Netsis'te belge oluşan kayıtlar burada tutulur. Yeniden işleme alma, otomatik aktarım yapmadan kaydı ana listeye döndürür.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-foreground dark:border-white/20"
            aria-label="Aktarılan belgeleri yenile"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div> : null}

        {isLoading ? (
          <div className="p-4"><StatePanel icon={<Loader2 className="animate-spin" size={18} />} title="Aktarılan belgeler yükleniyor" /></div>
        ) : isError ? (
          <div className="p-4"><StatePanel icon={<AlertCircle size={18} />} title="Aktarılan belgeler yüklenemedi" /></div>
        ) : records.length === 0 ? (
          <div className="p-4"><StatePanel icon={<PackageCheck size={18} />} title="Aktarılmış belge yok" description="Başarılı Netsis aktarımları burada görünecek." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse text-sm">
              <thead className="bg-[var(--crm-app-panel-muted)] text-left text-xs font-black uppercase text-[var(--crm-app-text-muted)]">
                <tr>
                  <th className={NDI_TABLE_CELL}>Kaynak Belge / Sipariş</th>
                  <th className={NDI_TABLE_CELL}>Müşteri</th>
                  <th className={NDI_TABLE_CELL}>Oluşan Netsis Belgeleri</th>
                  <th className={NDI_TABLE_CELL}>Durum</th>
                  <th className={NDI_TABLE_CELL}>Tarih</th>
                  <th className={NDI_TABLE_CELL}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-slate-300 dark:border-white/20">
                    <td className={NDI_TABLE_CELL}>
                      <div className="font-black text-foreground">{record.sourceDocumentNo}</div>
                      <div className="mt-1 text-xs font-bold text-primary">Sipariş: {record.sourceOrderNo || '-'}</div>
                      <div className="text-xs text-muted-foreground">Kaynak: {record.sourceNetsisCompany}</div>
                    </td>
                    <td className={NDI_TABLE_CELL}>
                      <div className="font-bold text-foreground">{record.customerName || record.customerCode}</div>
                      <div className="text-xs text-muted-foreground">{record.customerCode}</div>
                    </td>
                    <td className={NDI_TABLE_CELL}>
                      <div className="space-y-2">
                        {record.documents.map((document) => (
                          <details
                            key={`${document.targetNetsisCompany}-${document.documentType}-${document.netsisDocumentNo}`}
                            className="border-b border-slate-200 pb-2 last:border-b-0 dark:border-white/10"
                          >
                            <summary className="cursor-pointer font-bold text-foreground">
                              {document.targetNetsisCompany} · {document.documentType} · {document.netsisDocumentNo} · Seri {document.targetSeries} · {document.lineCount} kalem
                            </summary>
                            {document.lines.length === 0 ? (
                              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                                Bu kayıt kalem takibi eklenmeden önce oluşturulmuş.
                              </p>
                            ) : (
                              <div className="mt-2 overflow-x-auto">
                                <table className="min-w-[860px] w-full border-collapse text-xs">
                                  <thead className="bg-[var(--crm-app-panel-muted)] text-left font-black text-[var(--crm-app-text-muted)]">
                                    <tr>
                                      <th className="border p-2 dark:border-white/15">#</th>
                                      <th className="border p-2 dark:border-white/15">Stok</th>
                                      <th className="border p-2 text-right dark:border-white/15">Miktar</th>
                                      <th className="border p-2 text-right dark:border-white/15">Birim fiyat</th>
                                      <th className="border p-2 text-right dark:border-white/15">Tutar</th>
                                      <th className="border p-2 text-right dark:border-white/15">Döviz fiyatı</th>
                                      <th className="border p-2 dark:border-white/15">KDV</th>
                                      <th className="border p-2 dark:border-white/15">Depo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {document.lines.map((line) => (
                                      <tr key={`${document.netsisDocumentNo}-${line.lineNumber}-${line.stockCode}`}>
                                        <td className="border p-2 dark:border-white/15">{line.lineNumber}</td>
                                        <td className="border p-2 dark:border-white/15">
                                          <div className="font-black text-foreground">{line.stockCode}</div>
                                          <div className="text-muted-foreground">{line.stockName || '-'}</div>
                                        </td>
                                        <td className="border p-2 text-right font-bold dark:border-white/15">
                                          {numberFormatter.format(line.quantity)} {line.unit || ''}
                                        </td>
                                        <td className="border p-2 text-right font-bold dark:border-white/15">
                                          {priceFormatter.format(line.unitPrice)} TL
                                        </td>
                                        <td className="border p-2 text-right font-black dark:border-white/15">
                                          {priceFormatter.format(line.lineTotal)} TL
                                        </td>
                                        <td className="border p-2 text-right dark:border-white/15">
                                          {line.foreignUnitPrice != null
                                            ? `${priceFormatter.format(line.foreignUnitPrice)} (Tip ${line.currencyType ?? '-'})`
                                            : '-'}
                                        </td>
                                        <td className="border p-2 dark:border-white/15">
                                          {line.vatRate != null ? `%${numberFormatter.format(line.vatRate)}` : '-'}
                                        </td>
                                        <td className="border p-2 dark:border-white/15">
                                          {line.sourceWarehouse || '-'} → {line.targetWarehouse || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </details>
                        ))}
                      </div>
                    </td>
                    <td className={NDI_TABLE_CELL}>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {statusLabels[record.status] || record.status}
                      </span>
                    </td>
                    <td className={NDI_TABLE_CELL}>{formatDate(record.completedDate || record.createdDate)}</td>
                    <td className={NDI_TABLE_CELL}>
                      <button
                        type="button"
                        onClick={() => onReopen(record)}
                        disabled={!record.isActive || record.status === 'Processing' || reopeningRecordId != null}
                        className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-xs font-black text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {reopeningRecordId === record.id ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                        Yeniden işleme al
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
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

      <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
        <RuleMini label="İşlem Modu" value={transfer.mode === 'manual' ? 'Manuel' : 'Otomatik'} />
        <RuleMini label="Belgeler" value={transfer.documentNos.join(', ')} />
        <RuleMini label="Kaynak Netsis" value={transfer.sourceNetsisCompanies.join(', ')} />
        <RuleMini label="Hedef Netsis" value={transfer.targetNetsisCompanies.join(', ')} />
        <RuleMini label="İrsaliye Serisi" value={transfer.dispatchSeries || 'Kullanılmayacak'} />
        <RuleMini label="Fatura Serisi" value={transfer.invoiceSeries} />
        <RuleMini label="Hedef Belge Grubu" value={String(transfer.targetDocumentGroupCount)} />
        <RuleMini label="ŞİRKET24 Fatura Grubu" value={String(transfer.sirket24InvoiceGroupCount)} />
        <RuleMini label="Hedefe Seçilen Miktar" value={numberFormatter.format(transfer.totalTransferQuantity)} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {transfer.previewDocuments.map((document, index) => (
          <div key={`${document.sourceDocumentNo}-${document.targetNetsisCompany}-${document.documentType}-${index}`} className="rounded-md border border-[#bbf7d0] bg-white px-3 py-2">
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
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold text-[#536780]">
              <span>KDV: %{numberFormatter.format(document.vatRate)}</span>
              <span>Miktar: {numberFormatter.format(document.transferQuantity)} / {numberFormatter.format(document.sourceQuantity)}</span>
              <span>Tarih: {document.documentDateRule}</span>
              <span>Kur: {document.exchangeRateRule}</span>
              <span className="col-span-2">Depo: {document.targetWarehouse || 'Kaynak kalem deposu'}</span>
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
              <th className="px-3 py-2">Ön Kontrol KDV</th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((line) => (
              <tr key={line.id} className="border-t border-[#e4ebf4]">
                <td className="px-3 py-2 font-black text-[#172033]">{line.orderNo}</td>
                <td className="px-3 py-2">
                  <div className="font-black text-[#e11d73]">{line.stockCode}</div>
                  <div className="line-clamp-1 font-bold text-[#42536b]">{line.stockName}</div>
                  {line.lineSpecialCode1 && (
                    <div className="text-xs font-bold text-[#718096]">Satır Kod1: {line.lineSpecialCode1}</div>
                  )}
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
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <RuleMini label="İrsaliye Belge Serisi" value={transfer.dispatchSeries || 'Kullanılmayacak'} />
            <RuleMini label="Fatura Belge Serisi" value={transfer.invoiceSeries} />
            <RuleMini label="Hedef Belge Grubu" value={String(transfer.targetDocumentGroupCount)} />
            <RuleMini label="ŞİRKET24 Fatura Grubu" value={String(transfer.sirket24InvoiceGroupCount)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {transfer.previewDocuments.map((document, index) => (
              <div key={`${document.sourceDocumentNo}-${document.targetNetsisCompany}-${document.documentType}-${index}`} className="rounded-xl border border-[#bbf7d0] bg-[#f7fffb] p-4">
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
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-white px-3 py-2">
                    <span>KDV: %{numberFormatter.format(document.vatRate)}</span>
                    <span>Miktar: {numberFormatter.format(document.transferQuantity)} / {numberFormatter.format(document.sourceQuantity)}</span>
                    <span>Tarih: {document.documentDateRule}</span>
                    <span>Kur: {document.exchangeRateRule}</span>
                    <span className="col-span-2">Depo: {document.targetWarehouse || 'Kaynak kalem deposu'}</span>
                  </div>
                  {document.isSirket24SourceInvoice ? (
                    <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[#92400e]">
                      Kaynak SIRKET24 irsaliyesi bağlantılı faturaya dönüştürülecek.
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

function TransferCompanyRoute({
  sourceCompany,
  sourceDocumentNo,
  targetCompany,
  documentType,
  targetSeries,
}: {
  sourceCompany: string;
  sourceDocumentNo: string;
  targetCompany: string;
  documentType: string;
  targetSeries: string;
}): ReactElement {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-stretch border-y border-[#d7e1ef] bg-white">
      <div className="min-w-0 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#64748b]">
          <Building2 size={13} /> Kaynak firma
        </div>
        <div className="mt-1 truncate text-sm font-black text-[#172033]">{sourceCompany}</div>
        <div className="mt-1 text-[10px] font-bold uppercase text-[#64748b]">Gönderilen belge</div>
        <div className="break-all text-xs font-black text-[#334155]">{sourceDocumentNo}</div>
      </div>

      <div className="flex items-center justify-center text-[#2563eb]" aria-hidden="true">
        <ArrowRight size={22} strokeWidth={2.5} />
      </div>

      <div className="min-w-0 bg-[#eff6ff] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#1d4ed8]">
          <Building2 size={13} /> Hedef firma
        </div>
        <div className="mt-1 truncate text-sm font-black text-[#172033]">{targetCompany}</div>
        <div className="mt-1 text-[10px] font-bold uppercase text-[#64748b]">Oluşturulan belge</div>
        <div className="break-words text-xs font-black text-[#334155]">{documentType} / Seri {targetSeries}</div>
      </div>
    </div>
  );
}

interface NdiGroupedCreatedDocument {
  document: NdiTransferCreatedDocumentDto;
  sourceDocumentNos: string[];
  lineCount: number;
}

function groupCreatedDocuments(documents: NdiTransferCreatedDocumentDto[]): NdiGroupedCreatedDocument[] {
  const groups = new Map<string, NdiGroupedCreatedDocument>();
  documents.forEach((document) => {
    const key = [
      document.targetNetsisCompany,
      document.documentType,
      document.targetSeries,
      document.netsisDocumentNo,
    ].join('|').toLocaleUpperCase('tr-TR');
    const current = groups.get(key);
    if (current) {
      if (!current.sourceDocumentNos.includes(document.sourceDocumentNo)) {
        current.sourceDocumentNos.push(document.sourceDocumentNo);
      }
      current.lineCount += document.lineCount;
      return;
    }

    groups.set(key, {
      document,
      sourceDocumentNos: [document.sourceDocumentNo],
      lineCount: document.lineCount,
    });
  });

  return Array.from(groups.values());
}

function CreatedTransferDocumentCard({ group }: { group: NdiGroupedCreatedDocument }): ReactElement {
  const { document, sourceDocumentNos, lineCount } = group;
  return (
    <div className="rounded-lg border border-[#bbf7d0] bg-[#f7fffb] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-black text-[#047857]">
          Başarılı {document.documentType}
        </span>
        <div className="flex flex-wrap gap-2 text-xs font-black text-[#536780]">
          {sourceDocumentNos.length > 1 ? <span>{sourceDocumentNos.length} kaynak belge birleşti</span> : null}
          <span>{lineCount} kalem</span>
        </div>
      </div>

      <div className="mt-3">
        <TransferCompanyRoute
          sourceCompany={document.sourceNetsisCompany}
          sourceDocumentNo={sourceDocumentNos.join(', ')}
          targetCompany={document.targetNetsisCompany}
          documentType={document.documentType}
          targetSeries={document.targetSeries}
        />
      </div>

      <div className="mt-3 border-t border-[#bbf7d0] pt-3">
        <div className="text-[10px] font-black uppercase text-[#047857]">Hedefte oluşan Netsis belge no</div>
        <div className="mt-1 break-all text-lg font-black text-[#172033]">{document.netsisDocumentNo}</div>
      </div>

      {document.netsisRecordNo || document.netsisReferenceNo ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-[#536780]">
          {document.netsisRecordNo ? <span>Kayıt No: {document.netsisRecordNo}</span> : null}
          {document.netsisReferenceNo ? <span>Referans No: {document.netsisReferenceNo}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function CreatedTransferDocumentsResult({ documents }: { documents: NdiTransferCreatedDocumentDto[] }): ReactElement {
  const groupedDocuments = groupCreatedDocuments(documents);
  return (
    <div className="overflow-hidden rounded-lg border border-[#bfdbfe] bg-white">
      <div className="border-b border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[10px] font-black uppercase text-[#1d4ed8]">
        Oluşturulan Netsis belgeleri · {groupedDocuments.length} benzersiz belge
      </div>
      <div className="divide-y divide-[#dbeafe]">
        {groupedDocuments.map(({ document, sourceDocumentNos }) => (
          <div
            key={`${document.targetNetsisCompany}-${document.documentType}-${document.netsisDocumentNo}`}
            className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(180px,1.4fr)_minmax(90px,0.6fr)] sm:items-center"
          >
            <div>
              <div className="text-[10px] font-black uppercase text-[#64748b]">Hedef firma</div>
              <div className="mt-0.5 text-sm font-black text-[#172033]">{document.targetNetsisCompany}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#64748b]">Belge türü</div>
              <div className="mt-0.5 text-sm font-black text-[#047857]">{document.documentType}</div>
              {sourceDocumentNos.length > 1 ? (
                <div className="mt-0.5 text-[10px] font-bold text-[#1d4ed8]">
                  {sourceDocumentNos.length} irsaliye tek belgede
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#64748b]">Netsis belge no</div>
              <div className="mt-0.5 break-all text-base font-black text-[#172033]">{document.netsisDocumentNo}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#64748b]">Seri</div>
              <div className="mt-0.5 text-sm font-black text-[#172033]">{document.targetSeries}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FailedTransferDocumentCard({ document }: { document: NdiTransferFailedDocumentDto }): ReactElement {
  return (
    <div className="rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
      <TransferCompanyRoute
        sourceCompany={document.sourceNetsisCompany}
        sourceDocumentNo={document.sourceDocumentNo}
        targetCompany={document.targetNetsisCompany}
        documentType={document.documentType}
        targetSeries={document.targetSeries}
      />
      <div className="mt-2 rounded-md border border-[#fecaca] bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase text-[#b91c1c]">Netsis hata detayı</div>
          {document.errorCode ? (
            <span className="rounded-full border border-[#fecaca] bg-[#fff1f2] px-2 py-0.5 font-mono text-[9px] font-black text-[#b91c1c]">
              {document.errorCode}
            </span>
          ) : null}
        </div>
        <div className="mt-1 break-words text-xs font-bold text-[#7f1d1d]">{document.errorMessage}</div>
      </div>
    </div>
  );
}

function TransferResultSummary({ result }: { result: NdiTransferCreateResponseDto }): ReactElement {
  const groupedDocuments = groupCreatedDocuments(result.createdDocuments);
  const invoiceCount = groupedDocuments.filter(({ document }) =>
    document.documentType.toLocaleLowerCase('tr-TR').includes('fatura')
  ).length;
  const dispatchCount = groupedDocuments.length - invoiceCount;
  const failedCount = result.failedDocuments.length;

  let summary = 'Netsis tarafında başarılı belge oluşturulmadı.';
  if (dispatchCount > 0 && invoiceCount > 0) {
    summary = `${dispatchCount} irsaliye ve ${invoiceCount} fatura oluşturuldu.`;
  } else if (dispatchCount > 0) {
    summary = `${dispatchCount} irsaliye oluşturuldu. Fatura oluşturulmadı.`;
  } else if (invoiceCount > 0) {
    summary = `${invoiceCount} fatura oluşturuldu. İrsaliye oluşturulmadı.`;
  }

  return (
    <div className="border-y border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
      <div className="text-[10px] font-black uppercase text-[#1d4ed8]">Bu işlemde ne oldu?</div>
      <div className="mt-1 text-base font-black text-[#172033]">{summary}</div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-[#475569]">
        <span>İrsaliye: {dispatchCount > 0 ? `${dispatchCount} oluşturuldu` : 'Oluşturulmadı'}</span>
        <span>Fatura: {invoiceCount > 0 ? `${invoiceCount} oluşturuldu` : 'Oluşturulmadı'}</span>
        <span>Hatalı işlem: {failedCount > 0 ? failedCount : 'Yok'}</span>
      </div>
    </div>
  );
}

function TransferResultPanel({ result }: { result: NdiTransferCreateResponseDto }): ReactElement {
  const groupedCreatedDocuments = groupCreatedDocuments(result.createdDocuments);
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
          <RuleBadge tone="success" label={`${groupedCreatedDocuments.length} benzersiz belge`} />
          {result.failedDocuments.length > 0 ? <RuleBadge tone="danger" label={`${result.failedDocuments.length} hatalı`} /> : null}
        </div>
      </div>

      <div className="mt-3">
        <TransferResultSummary result={result} />
      </div>

      {result.createdDocuments.length > 0 ? (
        <>
          <div className="mt-3">
            <CreatedTransferDocumentsResult documents={result.createdDocuments} />
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {groupedCreatedDocuments.map((group) => (
              <CreatedTransferDocumentCard
                key={`${group.document.targetNetsisCompany}-${group.document.documentType}-${group.document.netsisDocumentNo}`}
                group={group}
              />
            ))}
          </div>
        </>
      ) : null}

      {result.failedDocuments.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fff8f8] p-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#b91c1c]">
            <AlertCircle size={16} /> Hatalı belgeler
          </div>
          <div className="mt-3 space-y-3">
            {result.failedDocuments.map((document) => (
              <FailedTransferDocumentCard key={`${document.sourceDocumentNo}-${document.errorMessage}`} document={document} />
            ))}
          </div>
        </div>
      ) : null}

      {result.warnings.length > 0 ? <RuleTextList title="Aktarım Uyarıları" values={result.warnings} tone="warn" /> : null}
    </div>
  );
}

function TransferResultDialog({ result, onClose }: { result: NdiTransferCreateResponseDto; onClose: () => void }): ReactElement {
  const groupedCreatedDocuments = groupCreatedDocuments(result.createdDocuments);
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
          <TransferResultSummary result={result} />

          {result.createdDocuments.length > 0 ? (
            <>
              <div className="mt-4">
                <CreatedTransferDocumentsResult documents={result.createdDocuments} />
              </div>
              <div className="mt-4 grid gap-3">
                {groupedCreatedDocuments.map((group) => (
                  <CreatedTransferDocumentCard
                    key={`${group.document.targetNetsisCompany}-${group.document.documentType}-${group.document.netsisDocumentNo}`}
                    group={group}
                  />
                ))}
              </div>
            </>
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
              <div className="mt-3 space-y-3">
                {result.failedDocuments.map((document) => (
                  <FailedTransferDocumentCard key={`${document.sourceDocumentNo}-${document.errorMessage}`} document={document} />
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

type NdiScenarioModeFilter = 'all' | NetsisNdiTransferScenarioDto['mode'];

function SeriesGuide({
  activeRuleIds,
  ruleOutcomes,
  dispatchSeriesReady,
  invoiceSeriesReady,
  apiRules,
  rulesLoading,
  rulesError,
}: {
  activeRuleIds: Set<NdiTransferRule['id']>;
  ruleOutcomes: NdiRuleOutcome[];
  dispatchSeriesReady: boolean;
  invoiceSeriesReady: boolean;
  apiRules: NetsisNdiTransferRuleDto[];
  rulesLoading: boolean;
  rulesError: boolean;
}): ReactElement {
  const [familyFilter, setFamilyFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<NdiScenarioModeFilter>('all');
  const catalogEntries = apiRules.flatMap((rule) =>
    (rule.scenarios ?? []).map((scenario) => ({ rule, scenario })),
  );
  const automaticCount = catalogEntries.filter(({ scenario }) => scenario.mode === 'automatic').length;
  const manualCount = catalogEntries.filter(({ scenario }) => scenario.mode === 'manual').length;
  const activeRuleCodes = new Set(
    transferRules
      .filter((rule) => activeRuleIds.has(rule.id))
      .map((rule) => rule.sourceSerial.toUpperCase()),
  );
  const visibleEntries = catalogEntries.filter(({ rule, scenario }) =>
    (familyFilter === 'all' || rule.code.toUpperCase() === familyFilter) &&
    (modeFilter === 'all' || scenario.mode === modeFilter),
  );
  const filteredRule = familyFilter === 'all'
    ? null
    : apiRules.find((rule) => rule.code.toUpperCase() === familyFilter) ?? null;

  return (
    <div className="mt-3 rounded-lg border border-slate-300 bg-[var(--crm-app-panel-muted)] p-3 dark:border-white/20">
      <section data-testid="ndi-rule-scenario-matrix" className="min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-[var(--crm-app-panel)] dark:border-white/20">
      <div className="flex flex-col gap-3 border-b border-slate-300 px-3 py-3 dark:border-white/20 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-foreground">NDI Aktarım Kuralları</h3>
            <RuleBadge tone="info" label={`API'den ${catalogEntries.length} ayrı kural`} />
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
            Otomatik ve manuel aktarım kararları API kural kataloğundan güncel olarak listelenir.
          </p>
        </div>
        <div className="inline-flex w-fit shrink-0 rounded-md border border-slate-300 bg-[var(--crm-app-panel-muted)] p-1 dark:border-white/20" role="group" aria-label="Kural çalışma modu">
          {([
            ['all', `Tümü ${catalogEntries.length}`],
            ['automatic', `Otomatik ${automaticCount}`],
            ['manual', `Manuel ${manualCount}`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setModeFilter(value)}
              aria-label={value === 'all' ? 'Tüm çalışma modları' : value === 'automatic' ? 'Otomatik kurallar' : 'Manuel kurallar'}
              aria-pressed={modeFilter === value}
              className={`min-h-8 px-3 text-xs font-black transition ${modeFilter === value ? 'rounded bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-[var(--crm-app-panel-muted)] px-3 py-2 dark:border-white/20" role="group" aria-label="Kural şirketi">
        <button
          type="button"
          onClick={() => setFamilyFilter('all')}
          aria-label="Tüm kural grupları"
          aria-pressed={familyFilter === 'all'}
          className={`min-h-8 rounded-md px-3 text-xs font-black transition ${familyFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'border border-slate-300 bg-[var(--crm-app-panel)] text-muted-foreground hover:text-foreground dark:border-white/20'}`}
        >
          Tümü {catalogEntries.length}
        </button>
        {apiRules.map((rule) => {
          const code = rule.code.toUpperCase();
          const count = rule.scenarios?.length ?? 0;

          return (
            <button
              key={rule.code}
              type="button"
              onClick={() => setFamilyFilter(code)}
              aria-label={`Kural grubu ${code}`}
              aria-pressed={familyFilter === code}
              className={`min-h-8 rounded-md px-3 text-xs font-black transition ${familyFilter === code ? 'bg-primary text-white shadow-sm' : 'border border-slate-300 bg-[var(--crm-app-panel)] text-muted-foreground hover:text-foreground dark:border-white/20'}`}
            >
              {code} {count}
            </button>
          );
        })}
      </div>

      {rulesLoading ? (
        <div className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground">Kurallar API'den yükleniyor.</div>
      ) : rulesError ? (
        <div className="px-4 py-10 text-center text-sm font-semibold text-red-700 dark:text-red-300">NDI kural kataloğu API'den alınamadı.</div>
      ) : visibleEntries.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground">Seçilen filtrelere uygun aktarım kuralı bulunamadı.</div>
      ) : (
      <div className="max-h-[640px] divide-y divide-slate-300 overflow-y-auto overscroll-contain dark:divide-white/20">
        {visibleEntries.map(({ rule, scenario }) => (
          <NdiRuleScenarioRow
            key={`${rule.code}-${scenario.key}`}
            rule={rule}
            scenario={scenario}
            isActiveFamily={activeRuleCodes.has(rule.code.toUpperCase())}
          />
        ))}
      </div>
      )}

      {filteredRule && filteredRule.validationRules?.length > 0 ? (
        <div className="border-t border-slate-300 bg-amber-50/70 px-3 py-3 dark:border-white/20 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
            <ShieldCheck size={15} /> {filteredRule.code} API Koruma Kontrolleri
          </div>
          <div className="mt-2 grid gap-x-5 gap-y-1 2xl:grid-cols-2">
            {filteredRule.validationRules.map((validationRule) => (
              <div key={validationRule} className="flex gap-2 text-xs font-semibold leading-relaxed text-amber-950/80 dark:text-amber-100/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{validationRule}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      </section>

      {ruleOutcomes.length > 0 ? (
        <section className="mt-3 border-t border-slate-300 pt-3 dark:border-white/20">
          <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--crm-app-text-muted)]">Seçili Belgeye Uygulanan Sonuç</div>
          <div className="flex min-w-0 flex-col gap-2">
            {ruleOutcomes.map((outcome) => (
              <RuleOutcomeCard
                key={outcome.orderId}
                outcome={outcome}
                seriesReady={outcome.action === 'IRSALIYELISTIR' ? dispatchSeriesReady : invoiceSeriesReady}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function NdiRuleScenarioRow({
  rule,
  scenario,
  isActiveFamily,
}: {
  rule: NetsisNdiTransferRuleDto;
  scenario: NetsisNdiTransferScenarioDto;
  isActiveFamily: boolean;
}): ReactElement {
  return (
    <article
      data-testid="ndi-rule-scenario-row"
      className={`border-l-4 px-3 py-4 ${isActiveFamily ? 'border-l-primary bg-primary/5' : 'border-l-transparent odd:bg-transparent even:bg-[var(--crm-app-panel-muted)]'}`}
    >
      <div className="grid gap-3 2xl:grid-cols-[180px_minmax(0,1fr)_220px] 2xl:items-start">
        <div>
          <div className="flex flex-wrap gap-1">
            <RuleBadge tone="info" label={rule.code.toUpperCase()} />
            <RuleBadge tone={scenario.mode === 'automatic' ? 'success' : 'warn'} label={scenario.mode === 'automatic' ? 'Otomatik' : 'Manuel'} />
            {isActiveFamily ? <RuleBadge tone="success" label="Seçili belge grubu" /> : null}
          </div>
          <div className="mt-2 font-black leading-snug text-foreground">{scenario.title}</div>
          <div className="mt-1 text-[11px] font-bold text-muted-foreground">{rule.sourceNetsisCompany} -&gt; {rule.targetNetsisCompany}</div>
          <div className="mt-1 break-all font-mono text-[9px] font-bold text-muted-foreground">{scenario.key}</div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--crm-app-text-muted)]">Çalışma Koşulu</div>
          <p className="mt-1 font-semibold leading-relaxed text-foreground">{scenario.condition}</p>
        </div>
        <div className="border-l-2 border-primary/50 pl-3">
          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--crm-app-text-muted)]">Miktar Kuralı</div>
          <p className="mt-1 font-bold leading-relaxed text-foreground">{scenario.quantityRule}</p>
        </div>
      </div>

      <div className={`mt-3 grid gap-3 ${scenario.documents.length > 1 ? '2xl:grid-cols-2' : 'grid-cols-1'}`}>
        {scenario.documents.map((document, index) => (
          <div key={`${scenario.key}-${document.targetNetsisCompany}-${document.documentType}-${index}`} className="border-l-2 border-emerald-400 bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-black text-foreground">{document.targetNetsisCompany} · {document.documentType}</div>
              <div className="text-[11px] font-black text-emerald-800 dark:text-emerald-200">{document.quantityRule} · KDV {document.vatRule}</div>
            </div>
            <div className="mt-2 grid gap-x-4 gap-y-1 text-[11px] font-semibold leading-relaxed text-muted-foreground sm:grid-cols-2">
              <div><span className="font-black text-foreground">Tarih:</span> {document.dateRule}</div>
              <div><span className="font-black text-foreground">Kur:</span> {document.exchangeRateRule}</div>
            </div>
            <div className="mt-1 text-[11px] font-semibold leading-relaxed text-muted-foreground">{document.sourceLinkRule}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-[11px] leading-relaxed dark:border-white/10 2xl:grid-cols-3">
        <div><span className="font-black text-foreground">Seri:</span> <span className="font-semibold text-muted-foreground">{scenario.seriesRule}</span></div>
        <div><span className="font-black text-foreground">Depo:</span> <span className="font-semibold text-muted-foreground">{scenario.warehouseRule}</span></div>
        <div><span className="font-black text-foreground">Bağlantı:</span> <span className="font-semibold text-muted-foreground">{scenario.sourceLinkRule}</span></div>
      </div>

      {scenario.notes.length > 0 ? (
        <div className="mt-2 space-y-1">
          {scenario.notes.map((note) => (
            <div key={note} className="flex gap-2 text-[11px] font-semibold leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

const POINTER_DRAG_THRESHOLD = 5;

function isPointerDragClick(event: React.MouseEvent, pointerStart: { x: number; y: number } | null): boolean {
  if (pointerStart === null) {
    return false;
  }

  const deltaX = Math.abs(event.clientX - pointerStart.x);
  const deltaY = Math.abs(event.clientY - pointerStart.y);
  return deltaX > POINTER_DRAG_THRESHOLD || deltaY > POINTER_DRAG_THRESHOLD;
}

function useCollapsibleCardToggle(initialExpanded = false): {
  expanded: boolean;
  toggle: () => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleClick: (event: React.MouseEvent) => void;
} {
  const [expanded, setExpanded] = useState(initialExpanded);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (event: React.MouseEvent): void => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleClick = (event: React.MouseEvent): void => {
    if (isPointerDragClick(event, pointerStartRef.current)) {
      return;
    }

    window.getSelection()?.removeAllRanges();
    setExpanded((current) => !current);
  };

  const toggle = (): void => {
    setExpanded((current) => !current);
  };

  return {
    expanded,
    toggle,
    handleMouseDown,
    handleClick,
  };
}

function ExpandToggleButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-expanded={expanded}
      aria-label={expanded ? 'Kuralları daralt' : 'Kuralları genişlet'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-[var(--crm-app-panel)] text-foreground transition hover:bg-primary/10 dark:border-white/20"
    >
      <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
    </button>
  );
}

function RuleOutcomeCard({ outcome, seriesReady }: { outcome: NdiRuleOutcome; seriesReady: boolean }): ReactElement {
  const { expanded, toggle, handleMouseDown, handleClick } = useCollapsibleCardToggle();
  const statusLabel = !outcome.canProceed ? 'Bloklu' : seriesReady ? 'Hazır' : 'Seri bekleniyor';
  const statusTone = !outcome.canProceed ? 'danger' : seriesReady ? 'success' : 'warn';
  const cardTone = !outcome.canProceed
    ? 'border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/30'
    : seriesReady
      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/30'
      : 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30';

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`cursor-pointer rounded-lg border p-3 transition hover:shadow-sm ${cardTone}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-black text-foreground">{outcome.orderNo}</div>
          <div className="break-words text-xs font-bold text-[var(--crm-app-text-muted)]">
            {outcome.companyLabel} · Netsis {outcome.sourceNetsisCompany} {'->'} {outcome.targetNetsisCompany} · {outcome.actionLabel} · kaynak prefix {outcome.sourcePrefix}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:max-w-[45%] sm:shrink-0 sm:justify-end">
          <RuleBadge tone={statusTone} label={statusLabel} />
          <RuleBadge tone={outcome.targetWarehouseLocked ? 'warn' : 'info'} label={outcome.targetWarehouseLocked ? 'Depo sabit' : 'Kaynak depo'} />
          <ExpandToggleButton expanded={expanded} onToggle={toggle} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <RuleMini label="Hedef Seri" value={seriesReady ? outcome.targetSeries : 'Seçim gerekli'} />
        <RuleMini label="Hedef Depo" value={outcome.targetWarehouseLabel} />
        <RuleMini
          label="Aktarılacak Miktar"
          value={`${outcome.quantityRuleLabel}: ${numberFormatter.format(outcome.transferQuantity)} / ${numberFormatter.format(outcome.requestedQuantity)}`}
        />
        <RuleMini
          label="KDV"
          value={`Hedef şirket ${outcome.primaryVat ?? '-'} / SIRKET24 ${outcome.sirket24Vat ?? '-'}`}
        />
      </div>

      {expanded ? (
        <>
          <RuleTextList title="Sistem Kuralları" values={outcome.systemNotes} tone="info" />
          <RuleTextList title="Kullanıcı Kontrolü" values={outcome.userNotes} tone="success" />
          <RuleTextList title="Uyarılar" values={outcome.warnings} tone="warn" />
          <RuleTextList title="Bloklayan Kurallar" values={outcome.blocks} tone="danger" />
        </>
      ) : null}
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
