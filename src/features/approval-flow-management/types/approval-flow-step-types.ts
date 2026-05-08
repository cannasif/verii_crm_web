export interface ApprovalFlowStepGetDto {
  id: number;
  approvalFlowId: number;
  approvalFlowDescription?: string;
  stepOrder: number;
  approvalRoleGroupId: number;
  approvalRoleGroupName?: string;
  createdDate?: string;
  updatedDate?: string;
  isDeleted?: boolean;
}

export interface ApprovalFlowStepCreateDto {
  approvalFlowId: number;
  stepOrder: number;
  approvalRoleGroupId: number;
}

export interface ApprovalFlowStepUpdateDto {
  approvalFlowId: number;
  stepOrder: number;
  approvalRoleGroupId: number;
}

export interface ApprovalFlowStepReorderDto {
  approvalFlowId: number;
  steps: ApprovalFlowStepOrderDto[];
}

export interface ApprovalFlowStepOrderDto {
  id: number;
  stepOrder: number;
}

