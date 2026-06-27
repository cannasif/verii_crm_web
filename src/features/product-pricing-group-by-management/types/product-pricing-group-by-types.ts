import { z } from 'zod';
import { areDiscountRatesValid } from '@/lib/discount-rate-validation';

export interface ProductPricingGroupByDto {
  id: number;
  erpGroupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdBy?: number;
  updatedBy?: number;
  deletedBy?: number;
}

export interface CreateProductPricingGroupByDto {
  erpGroupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
}

export interface UpdateProductPricingGroupByDto {
  erpGroupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
}

export interface ProductPricingGroupByListFilters {
  erpGroupCode?: string;
  currency?: string;
  minListPrice?: number;
  maxListPrice?: number;
  minCostPrice?: number;
  maxCostPrice?: number;
  minDiscount?: number;
  maxDiscount?: number;
}

export interface ProductPricingGroupByFormData {
  erpGroupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
}

export const productPricingGroupByFormSchema = z.object({
  erpGroupCode: z
    .string()
    .min(1, 'productPricingGroupByManagement.erpGroupCodeRequired')
    .max(50, 'productPricingGroupByManagement.erpGroupCodeMaxLength'),
  currency: z
    .string()
    .min(1, 'productPricingGroupByManagement.currencyRequired')
    .max(50, 'productPricingGroupByManagement.currencyMaxLength'),
  listPrice: z
    .number()
    .min(0, 'productPricingGroupByManagement.listPriceMin'),
  costPrice: z
    .number()
    .min(0, 'productPricingGroupByManagement.costPriceMin'),
  discount1: z
    .number()
    .min(0, 'productPricingGroupByManagement.discount1Range')
    .max(100, 'productPricingGroupByManagement.discount1Range')
    .optional()
    .nullable(),
  discount2: z
    .number()
    .min(0, 'productPricingGroupByManagement.discount2Range')
    .max(100, 'productPricingGroupByManagement.discount2Range')
    .optional()
    .nullable(),
  discount3: z
    .number()
    .min(0, 'productPricingGroupByManagement.discount3Range')
    .max(100, 'productPricingGroupByManagement.discount3Range')
    .optional()
    .nullable(),
}).superRefine((data, ctx) => {
  if (
    !areDiscountRatesValid({
      discountRate1: data.discount1,
      discountRate2: data.discount2,
      discountRate3: data.discount3,
    })
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kademeli iskonto efektif %100 değerine ulaşamaz',
      path: ['discount3'],
    });
  }
});

export type ProductPricingGroupByFormSchema = z.infer<typeof productPricingGroupByFormSchema>;

export const CURRENCIES = [
  { value: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
] as const;

export const calculateFinalPrice = (
  listPrice: number,
  discount1?: number | null,
  discount2?: number | null,
  discount3?: number | null
): number => {
  let finalPrice = listPrice;
  if (discount1) {
    finalPrice = finalPrice * (1 - discount1 / 100);
  }
  if (discount2) {
    finalPrice = finalPrice * (1 - discount2 / 100);
  }
  if (discount3) {
    finalPrice = finalPrice * (1 - discount3 / 100);
  }
  return Math.max(0, finalPrice);
};

export const getCurrencySymbol = (currency: string | number, exchangeRates?: Array<{ dovizTipi: number; dovizIsmi: string | null }>): string => {
  if (exchangeRates) {
    const currencyValue = typeof currency === 'string' ? parseInt(currency, 10) : currency;
    const currencyData = exchangeRates.find((c) => c.dovizTipi === currencyValue);
    return currencyData?.dovizIsmi || String(currency);
  }
  const currencyValue = typeof currency === 'string' ? currency : String(currency);
  const currencyData = CURRENCIES.find((c) => c.value === currencyValue);
  return currencyData?.symbol || currencyValue;
};

import i18n from '@/lib/i18n';

export const formatPrice = (price: number, currency: string | number, exchangeRates?: Array<{ dovizTipi: number; dovizIsmi: string | null }>): string => {
  const symbol = getCurrencySymbol(currency, exchangeRates);
  
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price) + ` ${symbol}`;
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(2)}%`;
};
