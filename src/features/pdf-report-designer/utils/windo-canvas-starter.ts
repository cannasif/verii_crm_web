import type { PdfCanvasElement } from '../types/pdf-report-template.types';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

type CreateId = () => string;

function shape(
  createId: CreateId,
  x: number,
  y: number,
  width: number,
  height: number,
  style: PdfCanvasElement['style']
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'shape',
    section: y < 120 ? 'header' : y > 1020 ? 'footer' : 'content',
    x,
    y,
    width,
    height,
    style,
  };
}

function text(
  createId: CreateId,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  fontSize = 14,
  color = '#334155'
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'text',
    section: y < 120 ? 'header' : y > 1020 ? 'footer' : 'content',
    x,
    y,
    width,
    height,
    text: value,
    fontSize,
    color,
    fontFamily: 'Arial',
  };
}

function field(
  createId: CreateId,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  path: string,
  fontSize = 12,
  color = '#334155'
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'field',
    section: y < 120 ? 'header' : y > 1020 ? 'footer' : 'content',
    x,
    y,
    width,
    height,
    value: label,
    path,
    fontSize,
    color,
    fontFamily: 'Arial',
  };
}

function image(
  createId: CreateId,
  x: number,
  y: number,
  width: number,
  height: number,
  value?: string
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'image',
    section: y < 120 ? 'header' : y > 1020 ? 'footer' : 'content',
    x,
    y,
    width,
    height,
    value,
    style: {
      imageFit: 'contain',
    },
  };
}

function getDocumentTitle(ruleType: PricingRuleType): string {
  switch (ruleType) {
    case PricingRuleType.Demand:
      return 'TALEP FORMU';
    case PricingRuleType.Order:
      return 'SIPARIS FORMU';
    default:
      return 'FIYAT TEKLIFI';
  }
}

function getDocumentInfoTitle(ruleType: PricingRuleType): string {
  switch (ruleType) {
    case PricingRuleType.Demand:
      return 'TALEP BILGILERI';
    case PricingRuleType.Order:
      return 'SIPARIS BILGILERI';
    default:
      return 'TEKLIF BILGILERI';
  }
}

function getNumberLabel(ruleType: PricingRuleType): string {
  switch (ruleType) {
    case PricingRuleType.Demand:
      return 'Talep No:';
    case PricingRuleType.Order:
      return 'Siparis No:';
    default:
      return 'Teklif No:';
  }
}

export function createWindoCanvasStarter(
  createId: CreateId,
  ruleType: PricingRuleType = PricingRuleType.Quotation
): PdfCanvasElement[] {
  return [
    shape(createId, 0, 0, 794, 14, { background: '#345A99' }),

    shape(createId, 24, 28, 250, 120, { background: '#ffffff', border: '1px solid #d7dde8', radius: 12 }),
    shape(createId, 292, 28, 478, 120, { background: '#ffffff', border: '1px solid #d7dde8', radius: 12 }),
    image(createId, 102, 52, 94, 24, '/logo.png'),
    text(createId, 96, 112, 140, 20, getDocumentTitle(ruleType), 12, '#345A99'),
    text(createId, 316, 44, 180, 18, getDocumentInfoTitle(ruleType), 11, '#345A99'),
    text(createId, 316, 70, 88, 16, getNumberLabel(ruleType), 8.5, '#475569'),
    field(createId, 664, 70, 90, 16, '', 'OfferNo', 8.5, '#475569'),
    text(createId, 316, 90, 88, 16, 'Tarih:', 8.5, '#475569'),
    field(createId, 664, 90, 90, 16, '', 'OfferDate', 8.5, '#475569'),
    text(createId, 316, 110, 88, 16, 'Teslim:', 8.5, '#475569'),
    field(createId, 664, 110, 90, 16, '', 'DeliveryDate', 8.5, '#475569'),

    shape(createId, 24, 166, 370, 120, { background: '#ffffff', border: '1px solid #d7dde8', radius: 12 }),
    shape(createId, 410, 166, 360, 120, { background: '#ffffff', border: '1px solid #d7dde8', radius: 12 }),
    text(createId, 42, 184, 180, 18, 'FIRMA BILGILERI', 11, '#345A99'),
    text(createId, 42, 210, 220, 18, 'FIRMA ADI', 12, '#0f172a'),
    text(createId, 42, 234, 300, 16, 'Adres / Subeler / Iletisim bilgileri', 8, '#64748b'),
    text(createId, 42, 252, 220, 16, '+90 (___) ___ __ __', 8, '#64748b'),
    text(createId, 42, 270, 220, 16, 'info@firma.com', 8, '#64748b'),
    text(createId, 428, 184, 180, 18, 'MUSTERI (CARI)', 11, '#345A99'),
    field(createId, 428, 210, 260, 18, '', 'CustomerName'),
    field(createId, 428, 232, 260, 18, '', 'RepresentativeName'),
    field(createId, 428, 252, 300, 16, '', 'ShippingAddressText', 8, '#64748b'),
    field(createId, 428, 270, 160, 16, '', 'ErpCustomerCode', 8, '#64748b'),

    {
      id: createId(),
      type: 'table',
      section: 'content',
      x: 24,
      y: 382,
      width: 746,
      height: 360,
      columns: [
        { label: 'Gorsel', path: 'Lines.DefaultImagePath' },
        { label: 'Stok Kodu', path: 'Lines.ProductCode' },
        { label: 'Stok Adi / Aciklama', path: 'Lines.ProductName' },
        { label: 'Miktar', path: 'Lines.Quantity' },
        { label: 'Birim Fiyat', path: 'Lines.UnitPrice' },
        { label: 'Iskonto', path: 'Lines.DiscountRate1' },
        { label: 'Net Toplam', path: 'Lines.LineTotal' },
      ],
      columnWidths: [56, 92, 250, 64, 96, 76, 112],
      headerStyle: { backgroundColor: '#345A99', color: '#ffffff', fontSize: 9 },
      rowStyle: { fontSize: 7.5, color: '#334155', backgroundColor: '#ffffff' },
      alternateRowStyle: { fontSize: 7.5, color: '#334155', backgroundColor: '#ffffff' },
      tableOptions: {
        repeatHeader: true,
        pageBreak: 'auto',
        dense: true,
        showBorders: true,
        groupByPath: undefined,
        groupHeaderLabel: 'Proje',
        showGroupFooter: false,
        groupFooterLabel: 'Grup Toplami',
        groupFooterValuePath: 'LineTotal',
        detailColumnPath: 'Lines.ProductName',
        detailPaths: ['Description1', 'Description2', 'Description3'],
        detailLineFontSize: 7,
        detailLineColor: '#64748b',
      },
      style: { border: '1px solid #d7dde8', radius: 12 },
    },

    shape(createId, 24, 770, 350, 96, { background: '#ffffff', border: '1px solid #d7dde8', radius: 12 }),
    text(createId, 42, 790, 180, 18, 'MUSTERI ONAYI', 10, '#64748b'),
    text(createId, 142, 846, 120, 16, 'Kase ve imza', 10, '#94a3b8'),
    {
      id: createId(),
      type: 'quotationTotals',
      section: 'content',
      x: 524,
      y: 770,
      width: 246,
      height: 140,
      text: 'TOPLAM OZETI',
      pageNumbers: [1],
      quotationTotalsOptions: {
        layout: 'single',
        currencyMode: 'code',
        currencyPath: 'Currency',
        grossLabel: 'Brut Toplam',
        discountLabel: 'Iskonto',
        netLabel: 'Net Toplam',
        vatLabel: 'KDV',
        grandLabel: 'Genel Toplam',
        showGross: true,
        showDiscount: true,
        showVat: true,
        emphasizeGrandTotal: true,
        showNote: false,
        hideEmptyNote: true,
      },
      style: {
        background: '#ffffff',
        border: '1px solid #d7dde8',
        radius: 12,
      },
    },

    shape(createId, 0, 930, 794, 120, { background: '#f8fafc' }),
    text(createId, 24, 950, 250, 18, 'BELGE NOTLARI VE TESLIM BILGILERI', 11, '#345A99'),
    field(createId, 24, 978, 320, 18, 'Teslim sekli', 'SalesTypeDefinitionName'),
    field(createId, 24, 1002, 700, 18, 'Notlar', 'Note1', 10, '#475569'),
  ];
}
