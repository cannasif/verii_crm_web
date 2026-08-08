import { demandApi } from '@/features/demand/api/demand-api';
import type { DemandGetDto, DemandLineGetDto } from '@/features/demand/types/demand-types';
import { quotationApi } from '@/features/quotation/api/quotation-api';
import type { QuotationGetDto, QuotationLineGetDto } from '@/features/quotation/types/quotation-types';
import { orderApi } from '@/features/order/api/order-api';
import type { OrderGetDto, OrderLineGetDto } from '@/features/order/types/order-types';
import type { DashboardSalesDocumentType } from '../types/dashboard-sales-calendar';
import type {
  DashboardSalesDocumentDetail,
  DashboardSalesDocumentLineDetail,
} from '../types/dashboard-sales-document-detail';

type SalesDocumentHeader = DemandGetDto | QuotationGetDto | OrderGetDto;
type SalesDocumentLine = DemandLineGetDto | QuotationLineGetDto | OrderLineGetDto;

function mapLine(line: SalesDocumentLine): DashboardSalesDocumentLineDetail {
  return {
    id: line.id,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountAmount: line.discountAmount1 + line.discountAmount2 + line.discountAmount3,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    lineGrandTotal: line.lineGrandTotal,
    description: line.description,
  };
}

function mapDetail(
  documentType: DashboardSalesDocumentType,
  header: SalesDocumentHeader,
  lines: SalesDocumentLine[],
): DashboardSalesDocumentDetail {
  return {
    id: header.id,
    documentType,
    documentNumber: header.offerNo?.trim() || `#${header.id}`,
    revisionNumber: header.revisionNo,
    documentDate: header.offerDate,
    deliveryDate: header.deliveryDate,
    customerName: header.potentialCustomerName?.trim() || '',
    customerCode: header.erpCustomerCode,
    representativeName: header.representativeName,
    description: header.description,
    paymentTypeName: header.paymentTypeName,
    deliveryMethod: header.deliveryMethod,
    currency: header.currency,
    total: header.total,
    grandTotal: header.grandTotal,
    status: header.status,
    isErpIntegrated: header.isERPIntegrated === true,
    erpIntegrationNumber: header.erpIntegrationNumber,
    lines: lines.map(mapLine),
  };
}

export async function getDashboardSalesDocumentDetail(
  documentType: DashboardSalesDocumentType,
  documentId: number,
): Promise<DashboardSalesDocumentDetail> {
  switch (documentType) {
    case 'Demand': {
      const [header, lines] = await Promise.all([
        demandApi.getById(documentId),
        demandApi.getDemandLinesByDemandId(documentId),
      ]);
      return mapDetail(documentType, header, lines);
    }
    case 'Quotation': {
      const [header, lines] = await Promise.all([
        quotationApi.getById(documentId),
        quotationApi.getQuotationLinesByQuotationId(documentId),
      ]);
      return mapDetail(documentType, header, lines);
    }
    case 'Order': {
      const [header, lines] = await Promise.all([
        orderApi.getById(documentId),
        orderApi.getOrderLinesByOrderId(documentId),
      ]);
      return mapDetail(documentType, header, lines);
    }
  }
}
