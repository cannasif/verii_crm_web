import { z } from 'zod';

export interface PaymentTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreatePaymentTypeDto {
  name: string;
  description?: string;
}

export interface UpdatePaymentTypeDto {
  name: string;
  description?: string;
}

export interface PaymentTypeListFilters {
  name?: string;
  description?: string;
}

export interface PaymentTypeFormData {
  name: string;
  description?: string;
}

export const paymentTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'paymentTypeManagement.form.name.required')
    .max(100, 'paymentTypeManagement.form.name.maxLength'),
  description: z
    .string()
    .max(500, 'paymentTypeManagement.form.description.maxLength')
    .optional()
    .or(z.literal('')),
});

export type PaymentTypeFormSchema = z.infer<typeof paymentTypeFormSchema>;
