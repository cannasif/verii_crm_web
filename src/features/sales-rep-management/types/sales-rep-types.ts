import { z } from 'zod';
import i18n from '@/lib/i18n';

export interface SalesRepGetDto {
  id: number;
  branchCode: number;
  salesRepCode: string;
  salesRepDescription?: string | null;
  name?: string | null;
  createdDate: string;
  updatedDate?: string | null;
  isDeleted: boolean;
  createdByFullUser?: string | null;
  updatedByFullUser?: string | null;
  deletedByFullUser?: string | null;
}

export interface SalesRepCreateDto {
  branchCode: number;
  salesRepCode: string;
  salesRepDescription?: string | null;
  name?: string | null;
}

export const salesRepFormSchema = z.object({
  branchCode: z.coerce
    .number({
      message: i18n.t('sales-rep-management.form.validation.branchCodeRequired', {
        ns: 'sales-rep-management',
      }),
    })
    .int(i18n.t('sales-rep-management.form.validation.branchCodeRequired', { ns: 'sales-rep-management' }))
    .min(0, i18n.t('sales-rep-management.form.validation.branchCodeRequired', { ns: 'sales-rep-management' })),
  salesRepCode: z
    .string({
      message: i18n.t('sales-rep-management.form.validation.codeRequired', { ns: 'sales-rep-management' }),
    })
    .min(1, {
      message: i18n.t('sales-rep-management.form.validation.codeRequired', { ns: 'sales-rep-management' }),
    })
    .max(8, {
      message: i18n.t('sales-rep-management.form.validation.codeMaxLength', { ns: 'sales-rep-management' }),
    })
    .refine((value) => value.trim().length > 0, {
      message: i18n.t('sales-rep-management.form.validation.codeRequired', { ns: 'sales-rep-management' }),
    }),
  salesRepDescription: z
    .string()
    .max(30, {
      message: i18n.t('sales-rep-management.form.validation.descriptionMaxLength', { ns: 'sales-rep-management' }),
    })
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .max(35, {
      message: i18n.t('sales-rep-management.form.validation.nameMaxLength', { ns: 'sales-rep-management' }),
    })
    .optional()
    .or(z.literal('')),
});

export type SalesRepFormInput = z.input<typeof salesRepFormSchema>;
export type SalesRepFormSchema = z.output<typeof salesRepFormSchema>;
