import { useEffect, useState } from 'react';

type RechartsModule = typeof import('recharts');

let cachedModule: RechartsModule | null = null;
let loadPromise: Promise<RechartsModule> | null = null;

function loadRechartsModule(): Promise<RechartsModule> {
  if (cachedModule) return Promise.resolve(cachedModule);
  if (loadPromise) return loadPromise;

  loadPromise = import('recharts').then((module) => {
    cachedModule = module;
    return module;
  });

  return loadPromise;
}

export function useRechartsModule(): RechartsModule | null {
  const [module, setModule] = useState<RechartsModule | null>(cachedModule);

  useEffect(() => {
    if (module) return;
    let active = true;

    void loadRechartsModule().then((loaded) => {
      if (!active) return;
      setModule(loaded);
    });

    return () => {
      active = false;
    };
  }, [module]);

  return module;
}

