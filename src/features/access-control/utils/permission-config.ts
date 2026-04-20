export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/': 'dashboard.view',

  '/demands': 'sales.demands.view',
  '/demands/create': 'sales.demands.view',
  '/demands/waiting-approvals': 'sales.demands.view',
  '/demands/:id': 'sales.demands.view',

  '/quotations': 'sales.quotations.view',
  '/quotations/create': 'sales.quotations.view',
  '/quotations/waiting-approvals': 'sales.quotations.view',
  '/quotations/:id': 'sales.quotations.view',

  '/orders': 'sales.orders.view',
  '/orders/create': 'sales.orders.view',
  '/orders/waiting-approvals': 'sales.orders.view',
  '/orders/:id': 'sales.orders.view',

  '/customer-management': 'customers.customer-management.view',
  '/customers/conflict-inbox': 'customers.conflict-inbox.view',
  '/erp-customers': 'customers.erp-customers.view',
  '/contact-management': 'customers.contact-management.view',
  '/customer-type-management': 'customers.customer-type-management.view',

  '/customer-360/:customerId': 'customer360.overview.view',
  '/salesmen-360/:userId': 'salesmen360.overview.view',

  '/daily-tasks': 'activity.daily-tasks.view',
  '/activity-management': 'activity.activity-management.view',
  '/activity-type-management': 'activity.activity-type-management.view',

  '/stocks': 'stock.stocks.view',
  '/stocks/:id': 'stock.stocks.view',

  '/product-pricing-management': 'pricing.product-pricing.view',
  '/product-pricing-group-by-management': 'pricing.product-pricing-group-by.view',
  '/pricing-rules': 'pricing.pricing-rules.view',

  '/reports': 'reports.list.view',
  '/reports/my': 'reports.list.view',
  '/reports/my/:id': 'reports.viewer.view',
  '/reports/new': 'reports.builder.view',
  '/reports/:id': 'reports.viewer.view',
  '/reports/:id/edit': 'reports.builder.view',

  '/report-designer': 'reports.designer.list.view',
  '/report-designer/create': 'reports.designer.editor.view',
  '/report-designer/edit/:id': 'reports.designer.editor.view',
  '/pdf-report-designer': 'reports.designer.list.view',
  '/pdf-report-designer/create': 'reports.designer.editor.view',
  '/pdf-report-designer/edit/:id': 'reports.designer.editor.view',
  '/pdf-report-designer/table-presets': 'reports.designer.editor.view',

  '/powerbi/configuration': 'powerbi.configuration.view',
  '/powerbi/reports': 'powerbi.reports.list.view',
  '/powerbi/reports/:id': 'powerbi.reports.viewer.view',
  '/powerbi/sync': 'powerbi.sync.view',
  '/powerbi/report-definitions': 'powerbi.report-definitions.view',
  '/powerbi/groups': 'powerbi.groups.view',
  '/powerbi/user-groups': 'powerbi.user-groups.view',
  '/powerbi/group-report-definitions': 'powerbi.group-report-definitions.view',
  '/powerbi/rls': 'powerbi.rls.view',

  '/approval-flow-management': 'approval.flow-management.view',
  '/approval-role-group-management': 'approval.role-group-management.view',
  '/approval-role-management': 'approval.role-management.view',
  '/approval-user-role-management': 'approval.user-role-management.view',

  '/country-management': 'definitions.country-management.view',
  '/city-management': 'definitions.city-management.view',
  '/district-management': 'definitions.district-management.view',
  '/shipping-address-management': 'definitions.shipping-address-management.view',
  '/title-management': 'definitions.title-management.view',
  '/payment-type-management': 'definitions.payment-type-management.view',
  '/definitions/activity-meeting-type-management': 'definitions.activity-meeting-type-management.view',
  '/definitions/activity-topic-purpose-management': 'definitions.activity-topic-purpose-management.view',
  '/definitions/activity-shipping-management': 'definitions.activity-shipping-management.view',
  '/document-serial-type-management': 'definitions.document-serial-type-management.view',
  '/definitions/sales-type-management': 'definitions.sales-type-management.view',
  '/definitions/sales-rep-management': 'definitions.sales-rep-management.view',
  '/definitions/sales-rep-match-management': 'definitions.sales-rep-match-management.view',

  '/user-management': 'admin-only',
  '/user-discount-limit-management': 'users.discount-limits.view',
  '/users/mail-settings': 'admin-only',
  '/settings/system-settings': 'admin-only',
  '/hangfire-monitoring': 'admin-only',
  '/access-control/permission-definitions': 'admin-only',
  '/access-control/permission-groups': 'admin-only',
  '/access-control/user-group-assignments': 'admin-only',
};

export const PATH_TO_PERMISSION_PATTERNS: Array<{ pattern: RegExp; permission: string }> = [
  { pattern: /^\/$/, permission: 'dashboard.view' },

  { pattern: /^\/demands(\/|$)/, permission: 'sales.demands.view' },
  { pattern: /^\/quotations(\/|$)/, permission: 'sales.quotations.view' },
  { pattern: /^\/orders(\/|$)/, permission: 'sales.orders.view' },

  { pattern: /^\/customer-management(\/|$)/, permission: 'customers.customer-management.view' },
  { pattern: /^\/customers\/conflict-inbox(\/|$)/, permission: 'customers.conflict-inbox.view' },
  { pattern: /^\/erp-customers(\/|$)/, permission: 'customers.erp-customers.view' },
  { pattern: /^\/contact-management(\/|$)/, permission: 'customers.contact-management.view' },
  { pattern: /^\/customer-type-management(\/|$)/, permission: 'customers.customer-type-management.view' },

  { pattern: /^\/customer-360(\/|$)/, permission: 'customer360.overview.view' },
  { pattern: /^\/salesmen-360(\/|$)/, permission: 'salesmen360.overview.view' },

  { pattern: /^\/daily-tasks(\/|$)/, permission: 'activity.daily-tasks.view' },
  { pattern: /^\/activity-management(\/|$)/, permission: 'activity.activity-management.view' },
  { pattern: /^\/activity-type-management(\/|$)/, permission: 'activity.activity-type-management.view' },

  { pattern: /^\/stocks(\/|$)/, permission: 'stock.stocks.view' },

  { pattern: /^\/product-pricing-management(\/|$)/, permission: 'pricing.product-pricing.view' },
  { pattern: /^\/product-pricing-group-by-management(\/|$)/, permission: 'pricing.product-pricing-group-by.view' },
  { pattern: /^\/pricing-rules(\/|$)/, permission: 'pricing.pricing-rules.view' },

  { pattern: /^\/reports\/[^/]+\/edit(\/|$)/, permission: 'reports.builder.view' },
  { pattern: /^\/reports\/new(\/|$)/, permission: 'reports.builder.view' },
  { pattern: /^\/reports\/my\/[^/]+(\/|$)/, permission: 'reports.viewer.view' },
  { pattern: /^\/reports\/my(\/|$)/, permission: 'reports.list.view' },
  { pattern: /^\/reports\/[^/]+(\/|$)/, permission: 'reports.viewer.view' },
  { pattern: /^\/reports(\/|$)/, permission: 'reports.list.view' },

  { pattern: /^\/report-designer\/(create|edit)(\/|$)/, permission: 'reports.designer.editor.view' },
  { pattern: /^\/report-designer(\/|$)/, permission: 'reports.designer.list.view' },
  { pattern: /^\/pdf-report-designer\/(create|edit|table-presets)(\/|$)/, permission: 'reports.designer.editor.view' },
  { pattern: /^\/pdf-report-designer(\/|$)/, permission: 'reports.designer.list.view' },

  { pattern: /^\/powerbi\/reports\/[^/]+(\/|$)/, permission: 'powerbi.reports.viewer.view' },
  { pattern: /^\/powerbi\/reports(\/|$)/, permission: 'powerbi.reports.list.view' },
  { pattern: /^\/powerbi\/configuration(\/|$)/, permission: 'powerbi.configuration.view' },
  { pattern: /^\/powerbi\/sync(\/|$)/, permission: 'powerbi.sync.view' },
  { pattern: /^\/powerbi\/report-definitions(\/|$)/, permission: 'powerbi.report-definitions.view' },
  { pattern: /^\/powerbi\/groups(\/|$)/, permission: 'powerbi.groups.view' },
  { pattern: /^\/powerbi\/user-groups(\/|$)/, permission: 'powerbi.user-groups.view' },
  { pattern: /^\/powerbi\/group-report-definitions(\/|$)/, permission: 'powerbi.group-report-definitions.view' },
  { pattern: /^\/powerbi\/rls(\/|$)/, permission: 'powerbi.rls.view' },

  { pattern: /^\/approval-flow-management(\/|$)/, permission: 'approval.flow-management.view' },
  { pattern: /^\/approval-role-group-management(\/|$)/, permission: 'approval.role-group-management.view' },
  { pattern: /^\/approval-role-management(\/|$)/, permission: 'approval.role-management.view' },
  { pattern: /^\/approval-user-role-management(\/|$)/, permission: 'approval.user-role-management.view' },

  { pattern: /^\/country-management(\/|$)/, permission: 'definitions.country-management.view' },
  { pattern: /^\/city-management(\/|$)/, permission: 'definitions.city-management.view' },
  { pattern: /^\/district-management(\/|$)/, permission: 'definitions.district-management.view' },
  { pattern: /^\/shipping-address-management(\/|$)/, permission: 'definitions.shipping-address-management.view' },
  { pattern: /^\/title-management(\/|$)/, permission: 'definitions.title-management.view' },
  { pattern: /^\/payment-type-management(\/|$)/, permission: 'definitions.payment-type-management.view' },
  { pattern: /^\/definitions\/activity-meeting-type-management(\/|$)/, permission: 'definitions.activity-meeting-type-management.view' },
  { pattern: /^\/definitions\/activity-topic-purpose-management(\/|$)/, permission: 'definitions.activity-topic-purpose-management.view' },
  { pattern: /^\/definitions\/activity-shipping-management(\/|$)/, permission: 'definitions.activity-shipping-management.view' },
  { pattern: /^\/document-serial-type-management(\/|$)/, permission: 'definitions.document-serial-type-management.view' },
  { pattern: /^\/definitions\/sales-type-management(\/|$)/, permission: 'definitions.sales-type-management.view' },
  { pattern: /^\/definitions\/sales-rep-management(\/|$)/, permission: 'definitions.sales-rep-management.view' },
  { pattern: /^\/definitions\/sales-rep-match-management(\/|$)/, permission: 'definitions.sales-rep-match-management.view' },

  { pattern: /^\/user-discount-limit-management(\/|$)/, permission: 'users.discount-limits.view' },
];

export function isLeafPermissionCode(code: string): boolean {
  if (code === 'dashboard.view') return true;
  return code.split('.').filter(Boolean).length >= 3;
}

const CRUD_ACTIONS = ['view', 'create', 'update', 'delete'] as const;

function isCrudAction(action: string): action is (typeof CRUD_ACTIONS)[number] {
  return (CRUD_ACTIONS as readonly string[]).includes(action);
}

function normalizePermissionCodeForDisplay(code: string): string {
  const parts = code.split('.').filter(Boolean);
  if (parts.length < 2) return code;
  const action = parts[parts.length - 1]?.toLowerCase() ?? '';
  if (!isCrudAction(action)) return code;
  return [...parts.slice(0, -1), 'view'].join('.');
}

function buildCrudPermissionCodes(code: string): string[] {
  if (!isLeafPermissionCode(code)) return [];
  if (code === 'dashboard.view') return [code];

  const parts = code.split('.').filter(Boolean);
  if (parts.length < 3) return [code];

  return CRUD_ACTIONS.map((action) => [...parts.slice(0, -1), action].join('.'));
}

export const ACCESS_CONTROL_ADMIN_PERMISSIONS = [
  'access-control.permission-definitions.view',
  'access-control.permission-groups.view',
  'access-control.user-group-assignments.view',
] as const;

export const RBAC_FALLBACK_PERMISSION = 'access-control.permission-definitions.view' as const;

export const ACCESS_CONTROL_ADMIN_FALLBACK_TO_SYSTEM_ADMIN = true as const;

export const ACCESS_CONTROL_ADMIN_ONLY_PATTERNS: RegExp[] = [
  /^\/access-control(\/|$)/,
  /^\/user-management(\/|$)/,
  /^\/users\/mail-settings(\/|$)/,
  /^\/settings\/system-settings(\/|$)/,
  /^\/hangfire-monitoring(\/|$)/,
];



export const PERMISSION_CODE_DISPLAY: Record<string, { key?: string; fallback: string }> = {
  'dashboard.view': { key: 'sidebar.dashboard', fallback: 'Dashboard' },

  'sales.demands.view': { key: 'sidebar.demands', fallback: 'Talepler' },
  'sales.quotations.view': { key: 'sidebar.proposals', fallback: 'Teklifler' },
  'sales.orders.view': { key: 'sidebar.orders', fallback: 'Siparisler' },

  'customers.customer-management.view': { key: 'sidebar.customerManagement', fallback: 'Musteri Yonetimi' },
  'customers.conflict-inbox.view': { key: 'sidebar.customersConflictInbox', fallback: 'Cakisma Gelen Kutusu' },
  'customers.erp-customers.view': { key: 'sidebar.erpCustomerManagement', fallback: 'ERP Musteri' },
  'customers.contact-management.view': { key: 'sidebar.contactManagement', fallback: 'Musteri Iletisimleri' },
  'customers.customer-type-management.view': { key: 'sidebar.customerTypeManagement', fallback: 'Musteri Tipleri' },

  'customer360.overview.view': { key: 'customer360.title', fallback: 'Musteri 360' },
  'salesmen360.overview.view': { key: 'sidebar.salesKpi', fallback: 'Satis KPI' },

  'activity.daily-tasks.view': { key: 'sidebar.dailyTasks', fallback: 'Gunluk Isler' },
  'activity.activity-management.view': { key: 'sidebar.activityManagement', fallback: 'Aktivite Yonetimi' },
  'activity.activity-type-management.view': { key: 'sidebar.activityTypeManagement', fallback: 'Aktivite Tipleri' },

  'stock.stocks.view': { key: 'sidebar.stockManagement', fallback: 'Stok Yonetimi' },

  'pricing.product-pricing.view': { key: 'sidebar.productPricingManagement', fallback: 'Urun Fiyatlandirma' },
  'pricing.product-pricing-group-by.view': { key: 'sidebar.productPricingGroupByManagement', fallback: 'Fiyat Grubu Yonetimi' },
  'pricing.pricing-rules.view': { key: 'sidebar.pricingRuleManagement', fallback: 'Fiyat Kurallari' },

  'reports.list.view': { key: 'sidebar.reports', fallback: 'Raporlar' },
  'reports.builder.view': { key: 'sidebar.reportBuilder', fallback: 'Report Builder' },
  'reports.viewer.view': { key: 'sidebar.reports', fallback: 'Raporlar' },
  'reports.designer.list.view': { key: 'sidebar.pdfBuilder', fallback: 'PDF Builder' },
  'reports.designer.editor.view': { key: 'sidebar.pdfBuilder', fallback: 'PDF Builder' },

  'powerbi.configuration.view': { key: 'sidebar.powerbiConfiguration', fallback: 'PowerBI Konfigurasyon' },
  'powerbi.reports.list.view': { key: 'sidebar.powerbiReportsView', fallback: 'PowerBI Raporlari (Goruntule)' },
  'powerbi.reports.viewer.view': { key: 'sidebar.powerbiReportsView', fallback: 'PowerBI Raporlari (Goruntule)' },
  'powerbi.sync.view': { key: 'sidebar.powerbiSync', fallback: 'PowerBI Senkronizasyon' },
  'powerbi.report-definitions.view': { key: 'sidebar.powerbiReportDefinitions', fallback: 'PowerBI Raporlari' },
  'powerbi.groups.view': { key: 'sidebar.powerbiGroups', fallback: 'PowerBI Gruplari' },
  'powerbi.user-groups.view': { key: 'sidebar.powerbiUserGroups', fallback: 'PowerBI Kullanici Gruplari' },
  'powerbi.group-report-definitions.view': { key: 'sidebar.powerbiGroupReportMapping', fallback: 'PowerBI Grup-Rapor Esleme' },
  'powerbi.rls.view': { key: 'sidebar.powerbiRls', fallback: 'RLS Yonetimi' },

  'approval.flow-management.view': { key: 'sidebar.approvalFlowManagement', fallback: 'Onay Akis Yonetimi' },
  'approval.role-group-management.view': { key: 'sidebar.approvalRoleGroupManagement', fallback: 'Onay Rol Grubu Yonetimi' },
  'approval.role-management.view': { key: 'sidebar.approvalRoleManagement', fallback: 'Onay Rol Yonetimi' },
  'approval.user-role-management.view': { key: 'sidebar.approvalUserRoleManagement', fallback: 'Onay Kullanici Rolu Yonetimi' },

  'definitions.country-management.view': { key: 'sidebar.countryManagement', fallback: 'Ulke Yonetimi' },
  'definitions.city-management.view': { key: 'sidebar.cityManagement', fallback: 'Sehir Yonetimi' },
  'definitions.district-management.view': { key: 'sidebar.districtManagement', fallback: 'Ilce Yonetimi' },
  'definitions.shipping-address-management.view': { key: 'sidebar.shippingAddressManagement', fallback: 'Sevk Adresi Yonetimi' },
  'definitions.title-management.view': { key: 'sidebar.titleManagement', fallback: 'Unvan Yonetimi' },
  'definitions.payment-type-management.view': { key: 'sidebar.paymentTypeManagement', fallback: 'Odeme Tipi Yonetimi' },
  'definitions.activity-meeting-type-management.view': { key: 'sidebar.activityMeetingTypeManagement', fallback: 'Aktivite Toplanma Tipi' },
  'definitions.activity-topic-purpose-management.view': { key: 'sidebar.activityTopicPurposeManagement', fallback: 'Aktivite Amaci' },
  'definitions.activity-shipping-management.view': { key: 'sidebar.activityShippingManagement', fallback: 'Aktivite Teslim Bilgisi' },
  'definitions.document-serial-type-management.view': { key: 'sidebar.documentSerialTypeManagement', fallback: 'Dosya Tip Yonetimi' },
  'definitions.sales-type-management.view': { key: 'sidebar.salesTypeManagement', fallback: 'Satis Tipi Yonetimi' },
  'definitions.sales-rep-management.view': { key: 'sidebar.salesRepManagement', fallback: 'Sales Rep Kod Yonetimi' },
  'definitions.sales-rep-match-management.view': { key: 'sidebar.salesRepMatchManagement', fallback: 'Sales Rep Eslesme Yonetimi' },

  'users.discount-limits.view': { key: 'sidebar.userDiscountLimitManagement', fallback: 'Kullanici Iskonto Limit Yonetimi' },
  'admin-only': { key: 'sidebar.systemSettings', fallback: 'Sistem Ayarları' },
};

export function getPermissionDisplayMeta(code: string): { key?: string; fallback: string } | null {
  const direct = PERMISSION_CODE_DISPLAY[code];
  if (direct) return direct;

  const normalizedCode = normalizePermissionCodeForDisplay(code);
  const normalizedMeta = PERMISSION_CODE_DISPLAY[normalizedCode];
  if (!normalizedMeta) return null;

  const parts = code.split('.').filter(Boolean);
  const action = parts[parts.length - 1]?.toLowerCase() ?? '';

  const actionFallbackMap: Record<string, string> = {
    view: 'Görüntüleme',
    create: 'Oluşturma',
    update: 'Güncelleme',
    delete: 'Silme',
  };

  const actionFallback = actionFallbackMap[action];
  if (!actionFallback || normalizedCode === code) return normalizedMeta;

  return {
    fallback: `${normalizedMeta.fallback} - ${actionFallback}`,
  };
}

export function getPermissionDisplayLabel(
  code: string,
  translate: (key: string, fallback: string) => string
): string {
  const meta = getPermissionDisplayMeta(code);
  const normalizedCode = normalizePermissionCodeForDisplay(code);
  const normalizedMeta = PERMISSION_CODE_DISPLAY[normalizedCode];

  const parts = code.split('.').filter(Boolean);
  const action = parts[parts.length - 1]?.toLowerCase() ?? '';

  if (normalizedMeta && normalizedCode !== code && isCrudAction(action)) {
    const baseLabel = normalizedMeta.key
      ? translate(normalizedMeta.key, normalizedMeta.fallback)
      : normalizedMeta.fallback;

    const actionKeyMap: Record<string, string> = {
      view: 'permissionGroups.permissionsPanel.actions.read',
      create: 'permissionGroups.permissionsPanel.actions.create',
      update: 'permissionGroups.permissionsPanel.actions.update',
      delete: 'permissionGroups.permissionsPanel.actions.delete',
    };

    const actionFallbackMap: Record<string, string> = {
      view: 'Read',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
    };

    return `${baseLabel} - ${translate(actionKeyMap[action] ?? '', actionFallbackMap[action] ?? action)}`;
  }

  if (meta?.key) return translate(meta.key, meta.fallback);
  if (meta) return meta.fallback;
  return code;
}

export const PERMISSION_MODULE_DISPLAY: Record<string, { key: string; fallback: string }> = {
  dashboard: { key: 'sidebar.home', fallback: 'Home' },
  sales: { key: 'sidebar.salesManagement', fallback: 'Sales' },
  customers: { key: 'sidebar.customers', fallback: 'Customers' },
  customer360: { key: 'customer360.title', fallback: 'Customer 360' },
  salesmen360: { key: 'sidebar.salesKpi', fallback: 'Sales KPI' },
  activity: { key: 'sidebar.activities', fallback: 'Activities' },
  stock: { key: 'sidebar.productAndStock', fallback: 'Stock' },
  pricing: { key: 'sidebar.productAndStock', fallback: 'Pricing' },
  reports: { key: 'sidebar.reports', fallback: 'Reports' },
  powerbi: { key: 'sidebar.powerbi', fallback: 'PowerBI' },
  approval: { key: 'sidebar.approvalDefinitions', fallback: 'Approvals' },
  definitions: { key: 'sidebar.definitions', fallback: 'Definitions' },
  users: { key: 'sidebar.users', fallback: 'Users' },
  'access-control': { key: 'sidebar.accessControl', fallback: 'Access Control' },
};

export function getPermissionModuleDisplayMeta(prefix: string): { key: string; fallback: string } | null {
  return PERMISSION_MODULE_DISPLAY[prefix] ?? null;
}
export const PERMISSION_CODE_CATALOG: string[] = Array.from(
  new Set(
    Object.values(ROUTE_PERMISSION_MAP)
      .filter((code) => code && code !== 'admin-only')
      .map((code) => code.trim())
      .flatMap((code) => buildCrudPermissionCodes(code))
  )
)
  .filter((code) => isLeafPermissionCode(code))
  .sort((a, b) => a.localeCompare(b));

export function getRoutesForPermissionCode(code: string): string[] {
  const normalizedCode = normalizePermissionCodeForDisplay(code);
  const routes = Object.entries(ROUTE_PERMISSION_MAP)
    .filter(([, permissionCode]) => permissionCode === normalizedCode)
    .map(([route]) => route);
  return routes.sort((a, b) => a.localeCompare(b));
}
