import { z } from 'zod';
import type { UpdateDocumentFieldLabelDto } from '@/features/document-field-labels/types/documentFieldLabels';

export interface SystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  hideDemandVatRate: boolean;
  hideQuotationVatRate: boolean;
  hideOrderVatRate: boolean;
  readonlyDemandVatRate: boolean;
  readonlyQuotationVatRate: boolean;
  readonlyOrderVatRate: boolean;
  catalogGroupCodeLabel?: string | null;
  catalogCode1Label?: string | null;
  catalogCode2Label?: string | null;
  catalogCode3Label?: string | null;
  catalogCode4Label?: string | null;
  catalogCode5Label?: string | null;
  customerCodeRuleEnabled: boolean;
  customerCodeMask?: string | null;
  customerCodeExample?: string | null;
  customerCodeErrorMessage?: string | null;
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
  updatedAt?: string;
}

export interface UpdateSystemSettingsDto extends SystemSettingsDto {
  documentFieldLabels?: {
    items: UpdateDocumentFieldLabelDto[];
  };
}

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
  hideDemandVatRate: boolean;
  hideQuotationVatRate: boolean;
  hideOrderVatRate: boolean;
  readonlyDemandVatRate: boolean;
  readonlyQuotationVatRate: boolean;
  readonlyOrderVatRate: boolean;
  catalogGroupCodeLabel?: string | null;
  catalogCode1Label?: string | null;
  catalogCode2Label?: string | null;
  catalogCode3Label?: string | null;
  catalogCode4Label?: string | null;
  catalogCode5Label?: string | null;
  customerCodeRuleEnabled: boolean;
  customerCodeMask?: string | null;
  customerCodeExample?: string | null;
  customerCodeErrorMessage?: string | null;
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
  hideDemandVatRate: z.boolean(),
  hideQuotationVatRate: z.boolean(),
  hideOrderVatRate: z.boolean(),
  readonlyDemandVatRate: z.boolean(),
  readonlyQuotationVatRate: z.boolean(),
  readonlyOrderVatRate: z.boolean(),
  catalogGroupCodeLabel: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  catalogCode1Label: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  catalogCode2Label: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  catalogCode3Label: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  catalogCode4Label: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  catalogCode5Label: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  customerCodeRuleEnabled: z.boolean(),
  customerCodeMask: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  customerCodeExample: z.string().max(50, 'common.form.maxLength').nullable().optional(),
  customerCodeErrorMessage: z.string().max(250, 'common.form.maxLength').nullable().optional(),
  demandApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4, 5])),
  quotationApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4, 5, 6])),
  orderApprovalCompletionAction: approvalCompletionActionSchema(new Set([1, 2, 3, 4])),
});

export type SystemSettingsFormSchema = z.infer<typeof systemSettingsFormSchema>;
