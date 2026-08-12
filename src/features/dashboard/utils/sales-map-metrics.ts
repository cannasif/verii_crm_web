import type {
  DashboardSalesMapLocation,
  DashboardSalesMapOwner,
  SalesMapMetric,
  SalesMapMetricState,
} from '../types/dashboard-sales-map';

export const SALES_MAP_OWNER_COLORS = [
  '#e11d74',
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#4f46e5',
  '#65a30d',
  '#c026d3',
] as const;

export interface RankedSalesMapLocation extends DashboardSalesMapLocation {
  score: number;
  color: string;
  dominantOwner: DashboardSalesMapOwner | null;
}

export function getSalesMapOwnerMetricValue(
  owner: DashboardSalesMapOwner,
  metric: SalesMapMetric,
): number {
  switch (metric) {
    case 'quotation':
      return owner.quotationCount;
    case 'order':
      return owner.orderCount;
    case 'erpOrder':
      return owner.erpOrderCount;
    case 'tlAmount':
      return owner.quotationTlAmount + owner.orderTlAmount;
  }
}

export function getSalesMapOwnerColor(owner: Pick<DashboardSalesMapOwner, 'userId' | 'fullName'>): string {
  const identity = owner.userId != null ? `user:${owner.userId}` : `name:${owner.fullName}`;
  const hash = Array.from(identity).reduce(
    (value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0,
    2_166_136_261,
  );
  return SALES_MAP_OWNER_COLORS[hash % SALES_MAP_OWNER_COLORS.length];
}

export function getDominantSalesMapOwner(
  location: DashboardSalesMapLocation,
  metrics: SalesMapMetricState,
): DashboardSalesMapOwner | null {
  const activeMetrics = (Object.keys(metrics) as SalesMapMetric[]).filter((metric) => metrics[metric]);
  return location.owners.reduce<DashboardSalesMapOwner | null>((dominant, owner) => {
    const ownerValue = activeMetrics.reduce((total, metric) => total + getSalesMapOwnerMetricValue(owner, metric), 0);
    const dominantValue = dominant == null
      ? -1
      : activeMetrics.reduce((total, metric) => total + getSalesMapOwnerMetricValue(dominant, metric), 0);
    return ownerValue > dominantValue ? owner : dominant;
  }, null);
}

export function getSalesMapMetricValue(
  location: DashboardSalesMapLocation,
  metric: SalesMapMetric,
): number {
  switch (metric) {
    case 'quotation':
      return location.quotationCount;
    case 'order':
      return location.orderCount;
    case 'erpOrder':
      return location.erpOrderCount;
    case 'tlAmount':
      return location.quotationTlAmount + location.orderTlAmount;
  }
}

export function rankSalesMapLocations(
  locations: DashboardSalesMapLocation[],
  metrics: SalesMapMetricState,
): RankedSalesMapLocation[] {
  const activeMetrics = (Object.keys(metrics) as SalesMapMetric[]).filter((metric) => metrics[metric]);
  if (activeMetrics.length === 0) {
    return locations.map((location) => ({
      ...location,
      score: 0,
      dominantOwner: null,
      color: SALES_MAP_OWNER_COLORS[0],
    }));
  }

  const maxima = new Map<SalesMapMetric, number>();
  activeMetrics.forEach((metric) => {
    maxima.set(metric, Math.max(1, ...locations.map((location) => getSalesMapMetricValue(location, metric))));
  });

  return locations
    .map((location) => {
      const dominantOwner = getDominantSalesMapOwner(location, metrics);
      return {
        ...location,
        dominantOwner,
        color: dominantOwner ? getSalesMapOwnerColor(dominantOwner) : SALES_MAP_OWNER_COLORS[0],
        score: activeMetrics.reduce(
          (total, metric) => total + getSalesMapMetricValue(location, metric) / (maxima.get(metric) ?? 1),
          0,
        ) / activeMetrics.length,
      };
    })
    .sort((left, right) => right.score - left.score || left.cityName.localeCompare(right.cityName));
}
