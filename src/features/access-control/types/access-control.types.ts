export interface ApiResponse<T> {
  success: boolean;
  message: string;
  exceptionMessage: string;
  data: T;
  errors: string[];
  timestamp: string;
  statusCode: number;
  className: string;
}

export interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

export interface PagedRequest {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[];
  filterLogic?: 'and' | 'or';
}

export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface MyPermissionsDto {
  userId: number;
  roleTitle: string;
  isSystemAdmin: boolean;
  permissionGroups: string[];
  permissionCodes: string[];
}

export interface AppBootstrapUserDto {
  id: number;
  email: string;
  name: string;
}

export interface AppBootstrapDto {
  user: AppBootstrapUserDto;
  permissions: MyPermissionsDto;
  systemSettings: import('@/features/system-settings').SystemSettingsDto;
}

export interface FullUserDto {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
}

export interface VisibilityPreviewPolicy {
  policyId: number;
  code: string;
  name: string;
  scopeType: number;
  includeSelf: boolean;
}

export interface PermissionDefinitionDto {
  id: number;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: FullUserDto;
  updatedByFullUser?: FullUserDto;
  deletedByFullUser?: FullUserDto;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  availableOnWeb: boolean;
  availableOnMobile: boolean;
}

export interface CreatePermissionDefinitionDto {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  availableOnWeb: boolean;
  availableOnMobile: boolean;
}

export interface UpdatePermissionDefinitionDto {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  availableOnWeb?: boolean;
  availableOnMobile?: boolean;

}

export interface SyncPermissionDefinitionItemDto {
  code: string;
  name?: string | null;
  description?: string | null;
  isActive: boolean;
  availableOnWeb: boolean;
  availableOnMobile: boolean;
}

export interface SyncPermissionDefinitionsDto {
  items: SyncPermissionDefinitionItemDto[];
  reactivateSoftDeleted?: boolean;
  updateExistingNames?: boolean;
  updateExistingDescriptions?: boolean;
  updateExistingIsActive?: boolean;
}

export interface PermissionDefinitionSyncResultDto {
  createdCount: number;
  updatedCount: number;
  reactivatedCount: number;
  totalProcessed: number;
}


export interface PermissionGroupDto {
  id: number;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: FullUserDto;
  updatedByFullUser?: FullUserDto;
  deletedByFullUser?: FullUserDto;
  name: string;
  description?: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  permissionDefinitionIds: number[];
  permissionCodes: string[];
}

export interface CreatePermissionGroupDto {
  name: string;
  description?: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  permissionDefinitionIds: number[];
}

export interface UpdatePermissionGroupDto {
  name?: string;
  description?: string;
  isSystemAdmin?: boolean;
  isActive?: boolean;
}

export interface SetPermissionGroupPermissionsDto {
  permissionDefinitionIds: number[];
}

export interface UserPermissionGroupDto {
  userId: number;
  permissionGroupIds: number[];
  permissionGroupNames: string[];
}

export interface SetUserPermissionGroupsDto {
  permissionGroupIds: number[];
}

export interface VisibilityPolicyDto {
  id: number;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: FullUserDto;
  updatedByFullUser?: FullUserDto;
  deletedByFullUser?: FullUserDto;
  code: string;
  name: string;
  entityType: string;
  description?: string;
  scopeType: number;
  includeSelf: boolean;
  isActive: boolean;
}

export interface CreateVisibilityPolicyDto {
  code: string;
  name: string;
  entityType: string;
  description?: string;
  scopeType: number;
  includeSelf: boolean;
  isActive: boolean;
}

export interface UpdateVisibilityPolicyDto {
  code?: string;
  name?: string;
  entityType?: string;
  description?: string;
  scopeType?: number;
  includeSelf?: boolean;
  isActive?: boolean;
}

export interface VisibilityPreviewUser {
  userId: number;
  fullName: string;
  email?: string | null;
}

export interface VisibilityPreviewResult {
  userId: number;
  entityType: string;
  hasExplicitPolicy: boolean;
  isUnrestricted: boolean;
  visibleUserIds: number[];
  visibleUsers: VisibilityPreviewUser[];
  policies: VisibilityPreviewPolicy[];
  approvalOverrideEntityIds: number[];
  approvalOverrideAuditEntries: ApprovalOverrideAuditEntry[];
}

export interface ApprovalOverrideAuditEntry {
  entityId: number;
  approvalRequestId: number;
  approvalActionId: number;
  stepOrder: number;
  currentStep: number;
  approvalStatus: number;
  approvalStatusName: string;
  documentType: string;
  flowDescription?: string | null;
  approvedByUserId: number;
  approvedByUserName?: string | null;
  reason: string;
}

export interface ActionSimulationResult {
  action: string;
  allowed: boolean;
  reason: string;
}

export interface VisibilityActionSimulationResult {
  userId: number;
  entityType: string;
  entityId: number;
  actions: ActionSimulationResult[];
}

export interface UserVisibilityPolicyDto {
  id: number;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: FullUserDto;
  updatedByFullUser?: FullUserDto;
  deletedByFullUser?: FullUserDto;
  userId: number;
  userDisplayName: string;
  visibilityPolicyId: number;
  visibilityPolicyName: string;
  entityType: string;
  scopeType: number;
}

export interface CreateUserVisibilityPolicyDto {
  userId: number;
  visibilityPolicyId: number;
}

export interface UpdateUserVisibilityPolicyDto {
  userId?: number;
  visibilityPolicyId?: number;
}
