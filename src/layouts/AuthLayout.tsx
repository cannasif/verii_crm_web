import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/shared/PageLoader';
import { RouteNamespaceLoader } from '@/components/shared/RouteNamespaceLoader';

export default function AuthLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouteNamespaceLoader>
        <Outlet />
      </RouteNamespaceLoader>
    </Suspense>
  );
}
