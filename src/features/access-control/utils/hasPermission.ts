import type { MyPermissionsDto } from '../types/access-control.types';
import { PATH_TO_PERMISSION_PATTERNS, ACCESS_CONTROL_ADMIN_ONLY_PATTERNS } from './permission-config';

export function hasPermission(
  permissions: MyPermissionsDto | null | undefined,
  requiredCode: string
): boolean {
  if (!permissions) return false;
  if (permissions.isSystemAdmin === true) return true;
  if (permissions.permissionCodes.includes(requiredCode)) return true;

  // Access-control endpoints protect privileged configuration with exact
  // permission codes on the API. A broad/module fallback here would let the
  // page mount and start a request that the API must reject with 403.
  if (requiredCode.startsWith('access-control.')) return false;

  const parts = requiredCode.split('.').filter(Boolean);
  const isViewLike = parts.length >= 3 && parts[parts.length - 1] === 'view';
  if (!isViewLike) return false;

  const moduleFallback = `${parts[0]}.view`;
  return permissions.permissionCodes.includes(moduleFallback);
}

export function resolveRequiredPermission(pathname: string): string | null {
  for (const { pattern, permission } of PATH_TO_PERMISSION_PATTERNS) {
    if (pattern.test(pathname)) {
      return permission;
    }
  }
  return null;
}

export function canAccessPath(
  permissions: MyPermissionsDto | null | undefined,
  pathname: string
): boolean {
  if (!permissions) return false;
  if (ACCESS_CONTROL_ADMIN_ONLY_PATTERNS.some((p) => p.test(pathname))) {
    return permissions.isSystemAdmin === true;
  }
  const required = resolveRequiredPermission(pathname);
  if (!required) return true;
  return hasPermission(permissions, required);
}
