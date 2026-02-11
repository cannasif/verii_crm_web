import { z } from 'zod';
import { OfferType, type OfferTypeValue } from '@/types/offer-type';

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
  salesType: z.enum([OfferType.YURTICI, OfferType.YURTDISI], { error: 'Satış tipi seçilmelidir' }),
  name: z
    .string()
    .min(1, 'Ad zorunludur')
    .refine((val) => val.trim().length > 0, 'Ad boş veya sadece boşluk olamaz'),
});

export type SalesTypeFormSchema = z.infer<typeof salesTypeFormSchema>;
