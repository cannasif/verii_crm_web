import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';

export type PurchaseCreateKind = 'request' | 'supplierQuotation' | 'order';

export interface PurchaseCreateConfig {
  title: string;
  description: string;
  listPath: string;
  endpoint: string;
  numberField: 'requestNo' | 'quotationNo' | 'orderNo';
  numberLabel: string;
  dateField: 'requestDate' | 'quotationDate' | 'orderDate';
  dateLabel: string;
  successMessage: string;
}

export interface PurchaseLineForm {
  clientKey: string;
  stockId: string;
  purchaseRequestLineId: string;
  supplierQuotationLineId: string;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
  discount1: string;
  discount2: string;
  discount3: string;
  deliveryDate: string;
  description1: string;
  description2: string;
  description3: string;
  imagePath: string;
  erpProjectCode: string;
}

export interface ExchangeRateForm {
  clientKey: string;
  currency: string;
  exchangeRate: string;
  exchangeRateDate: string;
  isOfficial: boolean;
}

export interface CreatedPurchaseDocument {
  id: number;
}

export const NOTE_COUNT = 15;

export const createClientKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createEmptyLine = (): PurchaseLineForm => ({
  clientKey: createClientKey(),
  stockId: '',
  purchaseRequestLineId: '',
  supplierQuotationLineId: '',
  productCode: '',
  productName: '',
  quantity: '1',
  unit: '',
  unitPrice: '0',
  vatRate: '20',
  discount1: '0',
  discount2: '0',
  discount3: '0',
  deliveryDate: '',
  description1: '',
  description2: '',
  description3: '',
  imagePath: '',
  erpProjectCode: '',
});

export const createEmptyExchangeRate = (): ExchangeRateForm => ({
  clientKey: createClientKey(),
  currency: '',
  exchangeRate: '1',
  exchangeRateDate: '',
  isOfficial: true,
});

export const purchaseCreateConfigs: Record<PurchaseCreateKind, PurchaseCreateConfig> = {
  request: {
    title: 'Yeni Satınalma Talebi',
    description: 'Tedarikçi seçmeden iç satınalma ihtiyacını oluşturun.',
    listPath: '/purchase/requests',
    endpoint: '/api/PurchaseRequest',
    numberField: 'requestNo',
    numberLabel: 'Talep No',
    dateField: 'requestDate',
    dateLabel: 'Talep Tarihi',
    successMessage: 'Satınalma talebi kaydedildi.',
  },
  supplierQuotation: {
    title: 'Yeni Tedarikçi Teklifi',
    description: 'Tedarikçiden gelen fiyat bilgisini satınalma teklif kaydı olarak girin.',
    listPath: '/purchase/supplier-quotations',
    endpoint: '/api/SupplierQuotation',
    numberField: 'quotationNo',
    numberLabel: 'Teklif No',
    dateField: 'quotationDate',
    dateLabel: 'Teklif Tarihi',
    successMessage: 'Tedarikçi teklifi kaydedildi.',
  },
  order: {
    title: 'Yeni Satınalma Siparişi',
    description: 'Seçilen tedarikçiye satınalma sipariş kaydı oluşturun.',
    listPath: '/purchase/orders',
    endpoint: '/api/PurchaseOrder',
    numberField: 'orderNo',
    numberLabel: 'Sipariş No',
    dateField: 'orderDate',
    dateLabel: 'Sipariş Tarihi',
    successMessage: 'Satınalma siparişi kaydedildi.',
  },
};

export function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMoney(value: number, currencyCode: string): string {
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currencyCode || 'TL'}`;
}

export function productToLineMarker(line: PurchaseLineForm): ProductSelectionResult {
  return {
    id: line.stockId ? toNumber(line.stockId) : undefined,
    code: line.productCode.trim(),
    name: line.productName.trim(),
    unit: line.unit.trim() || undefined,
    vatRate: toNumber(line.vatRate, 20),
  };
}
