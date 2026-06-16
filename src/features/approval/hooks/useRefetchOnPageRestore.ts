import { useEffect } from 'react';

export function useRefetchOnPageRestore(refetch: () => Promise<unknown>): void {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        void refetch();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [refetch]);
}
