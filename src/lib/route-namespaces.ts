const ROUTE_NAMESPACE_ENTRIES: Array<{ match: (pathname: string) => boolean; namespaces: string[] }> = [
  { match: (pathname) => pathname === '/', namespaces: ['dashboard'] },
  { match: (pathname) => pathname.startsWith('/auth') || pathname.startsWith('/reset-password'), namespaces: ['auth'] },
  { match: (pathname) => pathname.startsWith('/customer-management'), namespaces: ['customer-management'] },
  { match: (pathname) => pathname.startsWith('/customers/conflict-inbox'), namespaces: ['customerDedupe'] },
  { match: (pathname) => pathname.startsWith('/customer-360'), namespaces: ['customer360'] },
  { match: (pathname) => pathname.startsWith('/country-management'), namespaces: ['country-management'] },
  { match: (pathname) => pathname.startsWith('/city-management'), namespaces: ['city-management'] },
  { match: (pathname) => pathname.startsWith('/district-management'), namespaces: ['district-management'] },
  { match: (pathname) => pathname.startsWith('/contact-management'), namespaces: ['contact-management'] },
  { match: (pathname) => pathname.startsWith('/customer-type-management'), namespaces: ['customer-type-management'] },
  { match: (pathname) => pathname.startsWith('/shipping-address-management'), namespaces: ['shipping-address-management'] },
  { match: (pathname) => pathname.startsWith('/payment-type-management'), namespaces: ['payment-type-management'] },
  { match: (pathname) => pathname.startsWith('/activity-management'), namespaces: ['activity-management'] },
  { match: (pathname) => pathname.startsWith('/activity-type-management'), namespaces: ['activity-type'] },
  { match: (pathname) => pathname.startsWith('/definitions/activity-meeting-type-management'), namespaces: ['activity-meeting-type-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/activity-topic-purpose-management'), namespaces: ['activity-topic-purpose-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/activity-shipping-management'), namespaces: ['activity-shipping-management'] },
  { match: (pathname) => pathname.startsWith('/daily-tasks'), namespaces: ['daily-tasks', 'activity-management'] },
  { match: (pathname) => pathname.startsWith('/erp-customers'), namespaces: ['erp-customer-management'] },
  { match: (pathname) => pathname.startsWith('/title-management'), namespaces: ['title-management'] },
  { match: (pathname) => pathname.startsWith('/user-management'), namespaces: ['user-management'] },
  { match: (pathname) => pathname.startsWith('/users/mail-settings'), namespaces: ['mail-settings'] },
  { match: (pathname) => pathname.startsWith('/product-pricing-management'), namespaces: ['product-pricing-management'] },
  {
    match: (pathname) => pathname.startsWith('/product-pricing-group-by-management'),
    namespaces: ['product-pricing-group-by-management'],
  },
  {
    match: (pathname) => pathname.startsWith('/user-discount-limit-management'),
    namespaces: ['user-discount-limit-management'],
  },
  { match: (pathname) => pathname.startsWith('/approval-role-group-management'), namespaces: ['approval-role-group-management'] },
  { match: (pathname) => pathname.startsWith('/approval-user-role-management'), namespaces: ['approval-user-role-management'] },
  { match: (pathname) => pathname.startsWith('/approval-role-management'), namespaces: ['approval-role-management'] },
  { match: (pathname) => pathname.startsWith('/approval-flow-management'), namespaces: ['approval-flow-management'] },
  { match: (pathname) => pathname.startsWith('/quotations'), namespaces: ['quotation', 'approval', 'google-integration'] },
  { match: (pathname) => pathname.startsWith('/demands'), namespaces: ['demand', 'approval'] },
  { match: (pathname) => pathname.startsWith('/orders'), namespaces: ['order', 'approval', 'google-integration'] },
  { match: (pathname) => pathname.startsWith('/pricing-rules'), namespaces: ['pricing-rule'] },
  { match: (pathname) => pathname.startsWith('/stocks'), namespaces: ['stock'] },
  { match: (pathname) => pathname.startsWith('/document-serial-type-management'), namespaces: ['document-serial-type-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/sales-type-management'), namespaces: ['sales-type-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/windo-profil-demir-vida-tanimlama'), namespaces: ['windo-profil-demir-vida-management', 'common'] },
  { match: (pathname) => pathname.startsWith('/definitions/sales-rep-management'), namespaces: ['sales-rep-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/sales-rep-match-management'), namespaces: ['sales-rep-match-management'] },
  { match: (pathname) => pathname.startsWith('/definitions/category-definitions'), namespaces: ['category-definitions'] },
  { match: (pathname) => pathname.startsWith('/report-designer') || pathname.startsWith('/pdf-report-designer'), namespaces: ['report-designer'] },
  { match: (pathname) => pathname.startsWith('/access-control'), namespaces: ['access-control'] },
  { match: (pathname) => pathname.startsWith('/settings/integrations/google'), namespaces: ['google-integration'] },
  { match: (pathname) => pathname.startsWith('/settings/integrations/outlook'), namespaces: ['outlook-integration'] },
  { match: (pathname) => pathname.startsWith('/hangfire-monitoring'), namespaces: ['hangfire-monitoring'] },
  { match: (pathname) => pathname.startsWith('/powerbi/reports'), namespaces: ['powerbi-viewer'] },
  { match: (pathname) => pathname.startsWith('/profile'), namespaces: ['user-detail-management'] },
];

export const GLOBAL_ROUTE_NAMESPACES = ['common', 'notification', 'activity-image'] as const;

function deriveNamespacesFromPath(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const derived = new Set<string>();

  for (const segment of segments) {
    if (segment.startsWith(':')) continue;
    derived.add(segment);
    if (segment === 'google' || segment === 'outlook') {
      derived.add(`${segment}-integration`);
    }
  }

  return [...derived];
}

export function getNamespacesForPath(pathname: string): string[] {
  const namespaces = new Set<string>(GLOBAL_ROUTE_NAMESPACES);

  for (const entry of ROUTE_NAMESPACE_ENTRIES) {
    if (entry.match(pathname)) {
      entry.namespaces.forEach((namespace) => namespaces.add(namespace));
    }
  }
  deriveNamespacesFromPath(pathname).forEach((namespace) => namespaces.add(namespace));

  return [...namespaces];
}
