import type {
  DashboardSalesMapLocation,
  SalesMapMetric,
  SalesMapMetricState,
} from '../types/dashboard-sales-map';

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
): Array<DashboardSalesMapLocation & { score: number }> {
  const activeMetrics = (Object.keys(metrics) as SalesMapMetric[]).filter((metric) => metrics[metric]);
  if (activeMetrics.length === 0) return locations.map((location) => ({ ...location, score: 0 }));

  const maxima = new Map<SalesMapMetric, number>();
  activeMetrics.forEach((metric) => {
    maxima.set(metric, Math.max(1, ...locations.map((location) => getSalesMapMetricValue(location, metric))));
  });

  return locations
    .map((location) => ({
      ...location,
      score: activeMetrics.reduce(
        (total, metric) => total + getSalesMapMetricValue(location, metric) / (maxima.get(metric) ?? 1),
        0,
      ) / activeMetrics.length,
    }))
    .sort((left, right) => right.score - left.score || left.cityName.localeCompare(right.cityName));
}
