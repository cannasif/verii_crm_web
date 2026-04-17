import { z } from 'zod';

export interface SystemSettingsDto {
  defaultLanguage: string;
  defaultCurrencyCode: string;
  defaultTimeZone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  updatedAt?: string;
}

export interface UpdateSystemSettingsDto extends SystemSettingsDto {}

export interface EditableSystemSettingsDto {
  defaultCurrencyCode: string;
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
}

export const systemSettingsFormSchema = z.object({
  defaultCurrencyCode: z.string().min(1, 'common.required'),
  numberFormat: z.string().min(1, 'common.required'),
  decimalPlaces: z.coerce.number().int().min(0).max(6),
  restrictCustomersBySalesRepMatch: z.boolean(),
});

export type SystemSettingsFormSchema = z.infer<typeof systemSettingsFormSchema>;
