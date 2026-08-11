export type SalesMapMetric = 'quotation' | 'order' | 'erpOrder' | 'tlAmount';

export interface DashboardSalesMapLocation {
  key: string;
  cityId?: number | null;
  cityName: string;
  countryName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  quotationTlAmount: number;
  orderTlAmount: number;
}

export interface DashboardSalesMapData {
  isSystemAdmin: boolean;
  startDate: string;
  endDate: string;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  locatedDocumentCount: number;
  unlocatedDocumentCount: number;
  quotationTlAmount: number;
  orderTlAmount: number;
  locations: DashboardSalesMapLocation[];
}

export type SalesMapMetricState = Record<SalesMapMetric, boolean>;
