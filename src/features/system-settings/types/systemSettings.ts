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

export interface ErpConnectionTestResultDto {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresInSeconds?: number;
  accessTokenExpiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string | null;
  branchCode?: string | null;
  source?: string | null;
}

export interface EditableSystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
}

function normalizeIntegerOption(value: unknown, supportedValues: Set<number>, fallback: number): number {
  const numericValue = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (Number.isInteger(numericValue) && supportedValues.has(numericValue)) {
    return numericValue;
  }

  return fallback;
}

function approvalCompletionActionSchema(supportedValues: Set<number>, fallback = 1) {
  return z.preprocess(
    (value) => normalizeIntegerOption(value, supportedValues, fallback),
    z.number().int('common.form.invalidValue')
  );
}

export const systemSettingsFormSchema = z.object({
  numberFormat: z.string().min(1, 'common.required'),
  decimalPlaces: z.preprocess(
    (value) => Math.min(6, Math.max(0, normalizeIntegerOption(value, new Set([0, 1, 2, 3, 4, 5, 6]), 2))),
    z.number().int('common.form.invalidValue')
  ),
  restrictCustomersBySalesRepMatch: z.boolean(),
  demandApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4, 5])),
  quotationApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4, 5, 6])),
  orderApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4])),
});

export type SystemSettingsFormSchema = z.infer<typeof systemSettingsFormSchema>;
