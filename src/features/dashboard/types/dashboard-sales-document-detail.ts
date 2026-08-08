import type { DashboardSalesDocumentType } from './dashboard-sales-calendar';

export interface DashboardSalesDocumentLineDetail {
  id: number;
  productCode?: string | null;
  productName: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
}

export interface DashboardSalesDocumentDetail {
  id: number;
  documentType: DashboardSalesDocumentType;
  documentNumber: string;
  revisionNumber?: string | null;
  documentDate?: string | null;
  deliveryDate?: string | null;
  customerName: string;
  customerCode?: string | null;
  representativeName?: string | null;
  description?: string | null;
  paymentTypeName?: string | null;
  deliveryMethod?: string | null;
  currency: string;
  total: number;
  grandTotal: number;
  status?: number | null;
  isErpIntegrated: boolean;
  erpIntegrationNumber?: string | null;
  lines: DashboardSalesDocumentLineDetail[];
}
