export const DASHBOARD_QUERY_KEYS = {
  DATA: 'dashboard.data',
  CURRENCY_RATES: 'dashboard.currencyRates',
} as const;

export const queryKeys = {
  dashboard: () => [DASHBOARD_QUERY_KEYS.DATA] as const,
  currencyRates: () => [DASHBOARD_QUERY_KEYS.CURRENCY_RATES] as const,
};

export const dashboardQueryKeys = {
  root: ['dashboard'] as const,
  salesMap: (startDate: string, endDate: string, scope: 'all' | 'mine') =>
    [...dashboardQueryKeys.root, 'sales-map', startDate, endDate, scope] as const,
};
