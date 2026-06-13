export type OrderShareMode = 'native' | 'integrated';

function readShareMode(): OrderShareMode {
  const orderRaw = import.meta.env.VITE_ORDER_SHARE_MODE?.trim().toLowerCase();
  if (orderRaw === 'integrated') return 'integrated';
  if (orderRaw === 'native') return 'native';

  const quotationRaw = import.meta.env.VITE_QUOTATION_SHARE_MODE?.trim().toLowerCase();
  if (quotationRaw === 'integrated') return 'integrated';
  return 'native';
}

export const orderShareMode: OrderShareMode = readShareMode();

export const isIntegratedOrderShare = orderShareMode === 'integrated';

export const isNativeOrderShare = orderShareMode === 'native';
