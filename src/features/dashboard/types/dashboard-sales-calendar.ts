export type DashboardSalesDocumentType = 'Demand' | 'Quotation' | 'Order';

export interface DashboardSalesCalendarOwner {
  id: number;
  name: string;
  documentCount: number;
}

export interface DashboardSalesCalendarItem {
  id: number;
  documentType: number;
  documentNumber: string;
  revisionNumber?: string | null;
  documentDate: string;
  createdDate: string;
  representativeId?: number | null;
  representativeName: string;
  customerName: string;
  customerCode?: string | null;
  status?: number | null;
  isErpIntegrated: boolean;
  erpIntegrationNumber?: string | null;
  grandTotal: number;
  currency: string;
}

export interface DashboardSalesCalendarData {
  documentType: number;
  isSystemAdmin: boolean;
  startDate: string;
  endDate: string;
  totalCount: number;
  createdTodayCount: number;
  erpIntegratedCount: number;
  waitingApprovalCount: number;
  owners: DashboardSalesCalendarOwner[];
  items: DashboardSalesCalendarItem[];
}
