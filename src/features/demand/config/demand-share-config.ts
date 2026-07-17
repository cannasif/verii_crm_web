export type DemandShareMode = 'native' | 'integrated';

function readShareMode(): DemandShareMode {
  const demandRaw = import.meta.env.VITE_DEMAND_SHARE_MODE?.trim().toLowerCase();
  if (demandRaw === 'integrated') return 'integrated';
  if (demandRaw === 'native') return 'native';

  const quotationRaw = import.meta.env.VITE_QUOTATION_SHARE_MODE?.trim().toLowerCase();
  if (quotationRaw === 'integrated') return 'integrated';
  return 'native';
}

export const demandShareMode: DemandShareMode = readShareMode();

export const isIntegratedDemandShare = demandShareMode === 'integrated';

export const isNativeDemandShare = demandShareMode === 'native';
