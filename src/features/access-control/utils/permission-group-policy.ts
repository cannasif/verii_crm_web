import type {
  ClonePermissionGroupDto,
  PermissionGroupDto,
} from '../types/access-control.types';

export function isSystemManagedPermissionGroup(
  group: Pick<PermissionGroupDto, 'isSystemAdmin' | 'isSystemTemplate'> | null | undefined
): boolean {
  return group?.isSystemAdmin === true || group?.isSystemTemplate === true;
}

export function canClonePermissionGroup(
  group: Pick<PermissionGroupDto, 'isSystemAdmin'> | null | undefined
): boolean {
  return Boolean(group && !group.isSystemAdmin);
}

export function buildClonePermissionGroupDto(input: {
  name: string;
  description?: string | null;
}): ClonePermissionGroupDto {
  const description = input.description?.trim();
  return {
    name: input.name.trim(),
    description: description || undefined,
  };
}
