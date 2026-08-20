import { expect, test } from '@playwright/test';
import {
  buildClonePermissionGroupDto,
  canClonePermissionGroup,
  isSystemAdminAssignmentLocked,
  isSystemManagedPermissionGroup,
} from '../src/features/access-control/utils/permission-group-policy';

test('system admin and built-in templates are immutable', () => {
  expect(isSystemManagedPermissionGroup({ isSystemAdmin: true, isSystemTemplate: false })).toBe(true);
  expect(isSystemManagedPermissionGroup({ isSystemAdmin: false, isSystemTemplate: true })).toBe(true);
  expect(isSystemManagedPermissionGroup({ isSystemAdmin: false, isSystemTemplate: false })).toBe(false);
});

test('built-in templates are cloneable but system admin is not', () => {
  expect(canClonePermissionGroup({ isSystemAdmin: false })).toBe(true);
  expect(canClonePermissionGroup({ isSystemAdmin: true })).toBe(false);
});

test('only a system administrator can change System Admin membership', () => {
  expect(isSystemAdminAssignmentLocked({ isSystemAdmin: true }, false)).toBe(true);
  expect(isSystemAdminAssignmentLocked({ isSystemAdmin: true }, true)).toBe(false);
  expect(isSystemAdminAssignmentLocked({ isSystemAdmin: false }, false)).toBe(false);
});

test('clone payload is normalized and empty descriptions are omitted', () => {
  expect(buildClonePermissionGroupDto({ name: '  Satış Ekibi  ', description: '  Özel erişim  ' })).toEqual({
    name: 'Satış Ekibi',
    description: 'Özel erişim',
  });
  expect(buildClonePermissionGroupDto({ name: '  Saha Ekibi  ', description: '   ' })).toEqual({
    name: 'Saha Ekibi',
    description: undefined,
  });
});
