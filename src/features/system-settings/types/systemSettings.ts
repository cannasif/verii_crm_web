import { z } from 'zod';

export interface SystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
  updatedAt?: string;
}

export interface UpdateSystemSettingsDto extends SystemSettingsDto {}

export interface EditableSystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
}

export const systemSettingsFormSchema = z.object({
  numberFormat: z.string().min(1, 'common.required'),
  decimalPlaces: z.coerce.number().int().min(0).max(6),
  restrictCustomersBySalesRepMatch: z.boolean(),
  demandApprovalCompletionAction: z.coerce.number().int().min(1).max(5),
  quotationApprovalCompletionAction: z.coerce.number().int().min(1).max(5),
  orderApprovalCompletionAction: z.coerce.number().int().min(1).max(4),
});

export type SystemSettingsFormSchema = z.infer<typeof systemSettingsFormSchema>;
