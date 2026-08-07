import { z } from 'zod';

export interface ActivityTypeDto {
  id: number;
  name: string;
  description?: string;
  isCustomerRequired: boolean;
  createdDate: string;
  updatedDate?: string;
  createdBy?: string;
  createdByFullName?: string;
  createdByFullUser?: string;
}

export interface CreateActivityTypeDto {
  name: string;
  description?: string;
  isCustomerRequired: boolean;
}

export interface UpdateActivityTypeDto {
  name: string;
  description?: string;
  isCustomerRequired: boolean;
}

export interface ActivityTypeListFilters {
  name?: string;
  description?: string;
}

export interface ActivityTypeFormData {
  name: string;
  description?: string;
  isCustomerRequired: boolean;
}

export const activityTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'activityType.form.name.required')
    .max(100, 'activityType.form.name.maxLength'),
  description: z
    .string()
    .max(500, 'activityType.form.description.maxLength')
    .optional()
    .nullable(),
  isCustomerRequired: z.boolean(),
});

export type ActivityTypeFormSchema = z.infer<typeof activityTypeFormSchema>;
