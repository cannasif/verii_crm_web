import { z } from 'zod';

export const createPermissionDefinitionSchema = z.object({
  code: z.string().min(1).max(120),
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean(),
  availableOnWeb: z.boolean(),
  availableOnMobile: z.boolean(),
}).refine((value) => value.availableOnWeb || value.availableOnMobile, {
  path: ["availableOnWeb"],
  message: "At least one platform must be selected",
});

export const updatePermissionDefinitionSchema = createPermissionDefinitionSchema.partial();

export type CreatePermissionDefinitionSchema = z.infer<typeof createPermissionDefinitionSchema>;
export type UpdatePermissionDefinitionSchema = z.infer<typeof updatePermissionDefinitionSchema>;
