import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useMyPermissionsQuery } from './useMyPermissionsQuery';
import { hasPermission, resolveRequiredPermission } from '../utils/hasPermission';

type CrudAction = 'view' | 'create' | 'update' | 'delete';

function toCrudPermissionCode(permissionCode: string | null, action: CrudAction): string | null {
  if (!permissionCode) return null;

  const parts = permissionCode.split('.').filter(Boolean);
  if (parts.length === 0) return null;

  const lastPart = parts[parts.length - 1]?.toLowerCase();
  if (lastPart === 'view' || lastPart === 'create' || lastPart === 'update' || lastPart === 'delete') {
    return [...parts.slice(0, -1), action].join('.');
  }

  return [...parts, action].join('.');
}

export function useCrudPermissions(explicitViewPermissionCode?: string) {
  const location = useLocation();
  const { data: permissions } = useMyPermissionsQuery();

  return useMemo(() => {
    const viewPermissionCode =
      explicitViewPermissionCode ?? resolveRequiredPermission(location.pathname) ?? null;

    const viewCode = toCrudPermissionCode(viewPermissionCode, 'view');
    const createCode = toCrudPermissionCode(viewPermissionCode, 'create');
    const updateCode = toCrudPermissionCode(viewPermissionCode, 'update');
    const deleteCode = toCrudPermissionCode(viewPermissionCode, 'delete');

    return {
      basePermissionCode: viewPermissionCode,
      codes: {
        view: viewCode,
        create: createCode,
        update: updateCode,
        delete: deleteCode,
      },
      canView: viewCode ? hasPermission(permissions, viewCode) : true,
      canCreate: createCode ? hasPermission(permissions, createCode) : false,
      canUpdate: updateCode ? hasPermission(permissions, updateCode) : false,
      canDelete: deleteCode ? hasPermission(permissions, deleteCode) : false,
      isSystemAdmin: permissions?.isSystemAdmin === true,
    };
  }, [explicitViewPermissionCode, location.pathname, permissions]);
}
