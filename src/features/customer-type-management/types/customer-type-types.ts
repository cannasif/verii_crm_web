import { z } from 'zod';

export interface CustomerTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateCustomerTypeDto {
  name: string;
  description?: string;
}

export interface UpdateCustomerTypeDto {
  name: string;
  description?: string;
}

export interface CustomerTypeListFilters {
  name?: string;
  description?: string;
}

export interface CustomerTypeFormData {
  name: string;
  description?: string;
}

export const customerTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'form.nameRequired')
    .max(100, 'form.nameMaxLength'),
  description: z
    .string()
    .max(500, 'form.descriptionMaxLength')
    .optional()
    .or(z.literal('')),
});

export type CustomerTypeFormSchema = z.infer<typeof customerTypeFormSchema>;
