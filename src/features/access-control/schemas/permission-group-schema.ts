import { z } from 'zod';

export const createPermissionGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  isSystemAdmin: z.boolean(),
  isActive: z.boolean(),
  permissionDefinitionIds: z.array(z.number()),
});

export const updatePermissionGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isSystemAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const setPermissionGroupPermissionsSchema = z.object({
  permissionDefinitionIds: z.array(z.number()),
});

export const clonePermissionGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export type CreatePermissionGroupSchema = z.infer<typeof createPermissionGroupSchema>;
export type UpdatePermissionGroupSchema = z.infer<typeof updatePermissionGroupSchema>;
export type SetPermissionGroupPermissionsSchema = z.infer<typeof setPermissionGroupPermissionsSchema>;
export type ClonePermissionGroupSchema = z.infer<typeof clonePermissionGroupSchema>;
