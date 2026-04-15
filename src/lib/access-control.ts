interface AuthUserLike {
  id?: number;
  roles?: string[];
}

type Permission =
  | 'dashboard.view'
  | 'sales.view'
  | 'customers.view'
  | 'customer360.view'
  | 'salesman360.view'
  | 'activity.view'
  | 'stock.view'
  | 'pricing.view'
  | 'reports.view'
  | 'powerbi.view'
  | 'approval.view'
  | 'definitions.view'
  | 'users.manage';

const ADMIN_ROLE_KEYS = new Set(['admin', 'administrator', 'yonetici', 'yönetici', '1']);

const ROLE_PERMISSIONS: Record<string, Permission[] | ['*']> = {
  admin: ['*'],
  administrator: ['*'],
  yonetici: ['*'],
  yönetici: ['*'],
  '1': ['*'],
  salesman: [
    'dashboard.view',
    'sales.view',
    'customers.view',
    'customer360.view',
    'salesman360.view',
    'activity.view',
    'stock.view',
    'pricing.view',
    'reports.view',
  ],
  sales: [
    'dashboard.view',
    'sales.view',
    'customers.view',
    'customer360.view',
    'salesman360.view',
    'activity.view',
    'reports.view',
  ],
  salesmanager: [
    'dashboard.view',
    'sales.view',
    'customers.view',
    'customer360.view',
    'salesman360.view',
    'activity.view',
    'stock.view',
    'pricing.view',
    'reports.view',
    'approval.view',
  ],
  user: ['dashboard.view', 'activity.view', 'reports.view', 'customer360.view', 'salesman360.view'],
  employee: ['dashboard.view', 'activity.view', 'reports.view', 'customer360.view', 'salesman360.view'],
};

const ROUTE_PERMISSION_RULES: Array<{ pattern: RegExp; permission: Permission }> = [
  { pattern: /^\/$/, permission: 'dashboard.view' },
  { pattern: /^\/(demands|quotations|orders)(\/|$)/, permission: 'sales.view' },
  { pattern: /^\/(customer-management|customers\/conflict-inbox|erp-customers|contact-management|customer-type-management)(\/|$)/, permission: 'customers.view' },
  { pattern: /^\/customer-360\/\d+$/, permission: 'customer360.view' },
  { pattern: /^\/salesmen-360\/[^/]+$/, permission: 'salesman360.view' },
  { pattern: /^\/(daily-tasks|activity-management|activity-type-management)(\/|$)/, permission: 'activity.view' },
  { pattern: /^\/stocks(\/|$)/, permission: 'stock.view' },
  { pattern: /^\/(product-pricing-management|product-pricing-group-by-management|pricing-rules)(\/|$)/, permission: 'pricing.view' },
  { pattern: /^\/(reports|report-designer|salesmen-360)(\/|$)/, permission: 'reports.view' },
  { pattern: /^\/powerbi(\/|$)/, permission: 'powerbi.view' },
  { pattern: /^\/approval-(flow|role|role-group|user-role)-management(\/|$)/, permission: 'approval.view' },
  { pattern: /^\/(country-management|city-management|district-management|shipping-address-management|title-management|payment-type-management|document-serial-type-management)(\/|$)/, permission: 'definitions.view' },
  { pattern: /^\/definitions\/(activity-meeting-type-management|activity-topic-purpose-management|activity-shipping-management|sales-type-management|sales-rep-management|sales-rep-match-management)(\/|$)/, permission: 'definitions.view' },
  { pattern: /^\/(user-management|user-discount-limit-management|users\/mail-settings)(\/|$)/, permission: 'users.manage' },
];

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

function collectUserPermissions(user: AuthUserLike | null): Set<Permission | '*'> {
  const permissions = new Set<Permission | '*'>();
  const roles = (user?.roles ?? []).map(normalizeRole).filter(Boolean);

  for (const role of roles) {
    if (ADMIN_ROLE_KEYS.has(role)) {
      permissions.add('*');
      return permissions;
    }

    const rolePermissions = ROLE_PERMISSIONS[role];
    if (!rolePermissions) {
      continue;
    }

    for (const permission of rolePermissions) {
      permissions.add(permission);
    }
  }

  if (permissions.size === 0) {
    permissions.add('dashboard.view');
  }

  return permissions;
}

function resolveRequiredPermission(pathname: string): Permission | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.permission;
    }
  }

  return null;
}

export function canAccessPath(user: AuthUserLike | null, pathname: string): boolean {
  const requiredPermission = resolveRequiredPermission(pathname);
  if (!requiredPermission) {
    return true;
  }

  const permissions = collectUserPermissions(user);
  return permissions.has('*') || permissions.has(requiredPermission);
}
