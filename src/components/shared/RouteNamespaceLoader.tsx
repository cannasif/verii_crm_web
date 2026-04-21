import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureNamespacesReady } from '@/lib/i18n';
import { getNamespacesForPath } from '@/lib/route-namespaces';
import { PageLoader } from './PageLoader';

interface RouteNamespaceLoaderProps {
  children: ReactNode;
}

export function RouteNamespaceLoader({ children }: RouteNamespaceLoaderProps): ReactElement {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  const namespaces = useMemo(
    () => getNamespacesForPath(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    async function load(): Promise<void> {
      await ensureNamespacesReady(namespaces);
      if (cancelled) return;
      setLoadedPath(location.pathname);
      setReady(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, namespaces]);

  if (!ready || loadedPath !== location.pathname) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
