import { z } from 'zod';
import { OfferType, type OfferTypeValue } from '@/types/offer-type';
import i18n from '@/lib/i18n';

export interface SalesTypeGetDto {
  id: number;
  salesType: OfferTypeValue;
  name: string;
  createdDate: string;
  updatedDate?: string | null;
  isDeleted: boolean;
  createdByFullUser?: string | null;
  updatedByFullUser?: string | null;
  deletedByFullUser?: string | null;
}

export interface SalesTypeCreateDto {
  salesType: OfferTypeValue;
  name: string;
}

export interface SalesTypeUpdateDto {
  salesType: OfferTypeValue;
  name: string;
}

export interface SalesTypeListFilters {
  salesType?: OfferTypeValue;
  name?: string;
}

export const salesTypeFormSchema = z.object({
  salesType: z.enum([OfferType.YURTICI, OfferType.YURTDISI], {
    message: i18n.t('common.offerType.requiredMessage', { ns: 'common' }),
  }),
  name: z
    .string({ message: i18n.t('sales-type-management.form.validation.required', { ns: 'sales-type-management' }) })
    .min(1, { message: i18n.t('sales-type-management.form.validation.required', { ns: 'sales-type-management' }) })
    .refine((val) => val.trim().length > 0, { message: i18n.t('sales-type-management.form.validation.whitespace', { ns: 'sales-type-management' }) }),
});

export type SalesTypeFormSchema = z.infer<typeof salesTypeFormSchema>;
