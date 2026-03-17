import { z } from 'zod';

// --- DTO ---
export interface ProductPricingGetDto {
  id: number;
  erpProductCode: string;
  erpGroupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
  createdDate: string;
}

export interface CreateProductPricingDto {
  erpProductCode: string;
  erpGroupCode?: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
}

export interface UpdateProductPricingDto extends CreateProductPricingDto {
  id: number;
}

// --- SCHEMA (Validasyon Hatalarını Önlemek İçin Esnek) ---
export const productPricingFormSchema = z.object({
  erpProductCode: z.string().min(1, 'Stok kodu zorunludur'),
  
  // Grup kodu boş olabilir, zorunluluğu kaldırdım
  erpGroupCode: z.string().optional().or(z.literal('')),
  
  currency: z.string().min(1, 'Para birimi seçiniz'),
  
  // Sayısal alanlar (String gelirse Number'a çeviriyoruz)
  listPrice: z.preprocess((val) => Number(val), z.number().min(0, 'Fiyat 0 dan küçük olamaz')),
  costPrice: z.preprocess((val) => Number(val), z.number().min(0, 'Maliyet 0 dan küçük olamaz')),
  
  // İskontolar boş gelebilir
  discount1: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().min(0).max(100).optional()),
  discount2: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().min(0).max(100).optional()),
  discount3: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().min(0).max(100).optional()),
});

export type ProductPricingFormSchema = z.infer<typeof productPricingFormSchema>;

// --- SABİTLER (Hook yerine bunları kullanacağız) ---
export const CURRENCIES = [
  { value: 'TRY', label: 'Türk Lirası', symbol: '₺' },
  { value: 'USD', label: 'ABD Doları', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'Sterlin', symbol: '£' },
] as const;

// --- HESAPLAMA FONKSİYONLARI ---
export const calculateFinalPrice = (price: number, d1?: number | null, d2?: number | null, d3?: number | null) => {
  let final = Number(price) || 0;
  if (d1) final = final * (1 - Number(d1) / 100);
  if (d2) final = final * (1 - Number(d2) / 100);
  if (d3) final = final * (1 - Number(d3) / 100);
  return final > 0 ? final : 0;
};

export const calculateProfitMargin = (finalPrice: number, cost: number) => {
  const c = Number(cost) || 0;
  const f = Number(finalPrice) || 0;
  if (c <= 0) return { amount: f, percentage: 100 };
  const profit = f - c;
  return { amount: profit, percentage: (profit / c) * 100 };
};

type ExchangeRateSummary = { dovizTipi: number; dovizIsmi: string | null };

export const formatPrice = (
  amount: number,
  currency: string | number,
  locale?: string,
  exchangeRates?: ExchangeRateSummary[]
): string => {
  if (!Number.isFinite(amount)) {
    return '';
  }

  if (exchangeRates && exchangeRates.length > 0) {
    const numericCurrency =
      typeof currency === 'string' ? Number(currency) : currency;
    const rate = exchangeRates.find(
      (c) => c.dovizTipi === numericCurrency && !Number.isNaN(numericCurrency)
    );
    const label = rate?.dovizIsmi || String(currency);
    const loc = locale || 'tr';
    return (
      new Intl.NumberFormat(loc, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ` ${label}`
    );
  }

  const code = typeof currency === 'string' ? currency : String(currency);
  const symbol =
    CURRENCIES.find((c) => c.value === code)?.symbol || code;
  const loc = locale || 'tr';

  return (
    new Intl.NumberFormat(loc, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${symbol}`
  );
};