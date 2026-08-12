export type SalesMapMetric = 'quotation' | 'order' | 'erpOrder' | 'tlAmount';
export type SalesMapScope = 'all' | 'mine';

export interface DashboardSalesMapOwner {
  userId?: number | null;
  fullName: string;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  quotationTlAmount: number;
  orderTlAmount: number;
}

export interface DashboardSalesMapLocation {
  key: string;
  cityId?: number | null;
  cityName: string;
  countryName: string;
  countryCode: string;
  administrativeAreaType: 'country' | 'province' | 'stateOrProvince';
  latitude: number;
  longitude: number;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  quotationTlAmount: number;
  orderTlAmount: number;
  owners: DashboardSalesMapOwner[];
}

export interface DashboardSalesMapData {
  isSystemAdmin: boolean;
  isMineOnly: boolean;
  startDate: string;
  endDate: string;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  locatedDocumentCount: number;
  unlocatedDocumentCount: number;
  quotationTlAmount: number;
  orderTlAmount: number;
  countryCount: number;
  administrativeAreaCount: number;
  locations: DashboardSalesMapLocation[];
}

export type SalesMapMetricState = Record<SalesMapMetric, boolean>;
