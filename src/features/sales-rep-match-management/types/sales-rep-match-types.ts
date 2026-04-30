import { z } from 'zod';
import i18n from '@/lib/i18n';

export interface SalesRepMatchGetDto {
  id: number;
  salesRepCodeId: number;
  userId: number;
  salesRepCode: string;
  salesRepName?: string | null;
  userFullName?: string | null;
  username?: string | null;
  userEmail?: string | null;
  createdDate: string;
}

export interface SalesRepMatchCreateDto {
  salesRepCodeId: number;
  userId: number;
}

export const salesRepMatchFormSchema = z.object({
  salesRepCodeId: z.coerce
    .number({
      message: i18n.t('form.validation.salesRepRequired', {
        ns: 'sales-rep-match-management',
      }),
    })
    .min(1, i18n.t('form.validation.salesRepRequired', { ns: 'sales-rep-match-management' })),
  userId: z.coerce
    .number({
      message: i18n.t('form.validation.userRequired', {
        ns: 'sales-rep-match-management',
      }),
    })
    .min(1, i18n.t('form.validation.userRequired', { ns: 'sales-rep-match-management' })),
});

export type SalesRepMatchFormInput = z.input<typeof salesRepMatchFormSchema>;
export type SalesRepMatchFormSchema = z.output<typeof salesRepMatchFormSchema>;
