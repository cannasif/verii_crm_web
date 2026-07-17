import type { TFunction } from 'i18next';
import type { QuotationPreviewPdfLabels } from '@/features/quotation/utils/build-quotation-preview-pdf';

export function buildDemandPreviewPdfLabels(t: TFunction<'demand'>): QuotationPreviewPdfLabels {
  return {
    documentTitle: t('pdfExportTemplate.documentTitle'),
    senderLabel: t('pdfExportTemplate.senderLabel'),
    recipientLabel: t('pdfExportTemplate.recipientLabel'),
    metaDate: t('pdfExportTemplate.metaDate'),
    metaOfferNo: t('pdfExportTemplate.metaDemandNo'),
    notSpecified: t('pdfExportTemplate.notSpecified'),
    lineImage: t('pdfExportTemplate.lineImage'),
    productCode: t('lines.productCode'),
    productName: t('lines.productName'),
    quantity: t('lines.quantity'),
    unitPrice: t('lines.unitPrice'),
    unitPriceNet: t('pdfExportTemplate.unitPriceNet'),
    netUnitPriceColumn: t('pdfExportTemplate.netUnitPriceColumn'),
    lineDiscount: t('pdfExportTemplate.lineDiscount'),
    vatRate: t('pdfExportTemplate.vatRate'),
    lineTotal: t('lines.lineTotal'),
    priceDetail: t('pdfExportTemplate.priceDetail'),
    grossTotal: t('pdfExportTemplate.grossTotal'),
    lineDiscountTotal: t('pdfExportTemplate.lineDiscountTotal'),
    generalDiscount: t('pdfExportTemplate.generalDiscount'),
    netSubtotal: t('pdfExportTemplate.netSubtotal'),
    totalVat: t('pdfExportTemplate.totalVat'),
    grandTotalWithVat: t('pdfExportTemplate.grandTotalWithVat'),
    validityNote: t('pdfExportTemplate.footerNote'),
    draftWatermark: t('pdfExportTemplate.draftWatermark', { defaultValue: 'TASLAKTIR' }),
  };
}
