import { type ReactElement } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMyPermissionsQuery } from '../hooks/useMyPermissionsQuery';
import { canAccessPath } from '../utils/hasPermission';
import { UnauthorizedPage } from './UnauthorizedPage';

export function RoutePermissionGuard(): ReactElement {
  const location = useLocation();
  const { data: permissions, isLoading, isError } = useMyPermissionsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (isError) {
    return <UnauthorizedPage />;
  }

  if (!permissions) {
    return <UnauthorizedPage />;
  }

  if (canAccessPath(permissions, location.pathname)) {
    return <Outlet />;
  }

  return <UnauthorizedPage />;
}
