import { z } from 'zod';

export const createVisibilityPolicySchema = z.object({
  code: z.string().min(1, 'Code is required').max(120, 'Max 120 characters'),
  name: z.string().min(1, 'Name is required').max(150, 'Max 150 characters'),
  entityType: z.string().min(1, 'Entity type is required').max(60, 'Max 60 characters'),
  description: z.string().max(500, 'Max 500 characters').optional().or(z.literal('')),
  scopeType: z.number().min(1).max(4),
  includeSelf: z.boolean(),
  isActive: z.boolean(),
});

export type CreateVisibilityPolicySchema = z.infer<typeof createVisibilityPolicySchema>;
