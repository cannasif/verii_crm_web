export interface WaitingApprovalSidebarItem {
  id: number;
  approvalRequestId: number;
  status: number;
  title: string;
  stepOrder: number;
  approvedByUserFullName?: string | null;
  actionDate: string;
  metaLines?: string[];
}
