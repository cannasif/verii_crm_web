import { z } from 'zod';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

export const DocumentTypeEnum = {
  Demand: PricingRuleType.Demand,
  Quotation: PricingRuleType.Quotation,
  Order: PricingRuleType.Order,
} as const;

export type DocumentTypeEnum = typeof DocumentTypeEnum[keyof typeof DocumentTypeEnum];

export interface ApprovalFlowDto {
  id: number;
  documentType: number;
  documentTypeName?: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateApprovalFlowDto {
  documentType: number;
  description?: string;
  isActive: boolean;
}

export interface UpdateApprovalFlowDto {
  documentType: number;
  description?: string;
  isActive: boolean;
}

export interface ApprovalFlowListFilters {
  documentType?: number;
  isActive?: boolean;
  description?: string;
}

export interface ApprovalFlowFormData {
  documentType: number;
  description?: string;
  isActive: boolean;
}

export const approvalFlowFormSchema = z.object({
  documentType: z
    .number()
    .min(1, 'approvalFlow.form.documentTypeRequired'),
  description: z
    .string()
    .max(200, 'approvalFlow.form.descriptionMaxLength')
    .nullable()
    .optional(),
  isActive: z.boolean(),
});

export const approvalFlowStepFormSchema = z.object({
  approvalRoleGroupId: z.number().min(1, 'approvalFlowStep.form.approvalRoleGroupIdRequired'),
});

export type ApprovalFlowStepFormSchema = z.infer<typeof approvalFlowStepFormSchema>;

export type ApprovalFlowFormSchema = z.infer<typeof approvalFlowFormSchema>;
