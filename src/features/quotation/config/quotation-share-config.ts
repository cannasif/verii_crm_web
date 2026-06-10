/**
 * Teklif paylaşım modu.
 *
 * - `native` (varsayılan): Dialog yok; Web Share API ile doğrudan paylaşım (PDF ekli).
 *   Desteklenmeyen ortamda PDF indirilir + wa.me / mailto açılır.
 *
 * - `integrated`: API tabanlı dialog akışı (WhatsApp Cloud API + Gmail/Outlook).
 *   Backend hazır olunca: VITE_QUOTATION_SHARE_MODE=integrated
 */
export type QuotationShareMode = 'native' | 'integrated';

function readShareMode(): QuotationShareMode {
  const raw = import.meta.env.VITE_QUOTATION_SHARE_MODE?.trim().toLowerCase();
  if (raw === 'integrated') return 'integrated';
  return 'native';
}

export const quotationShareMode: QuotationShareMode = readShareMode();

export const isIntegratedQuotationShare = quotationShareMode === 'integrated';

export const isNativeQuotationShare = quotationShareMode === 'native';
