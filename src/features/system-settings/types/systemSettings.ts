import { z } from 'zod';

export interface SystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  updatedAt?: string;
}

export interface UpdateSystemSettingsDto extends SystemSettingsDto {}

export interface EditableSystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
}

export const systemSettingsFormSchema = z.object({
  numberFormat: z.string().min(1, 'common.required'),
  decimalPlaces: z.coerce.number().int().min(0).max(6),
  restrictCustomersBySalesRepMatch: z.boolean(),
  /** Cihazda saklanır; API payload’ına dahil edilmez. */
  showDescriptionFieldsSection: z.boolean(),
  customDescriptionLabel1: z.string().max(100),
  customDescriptionLabel2: z.string().max(100),
  customDescriptionLabel3: z.string().max(100),
});

export type SystemSettingsFormSchema = z.infer<typeof systemSettingsFormSchema>;
