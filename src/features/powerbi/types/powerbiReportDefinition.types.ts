import { z } from 'zod';

export interface CreatePowerBIReportDefinitionDto {
  name: string;
  description?: string;
  workspaceId: string;
  reportId: string;
  datasetId?: string;
  embedUrl?: string;
  isActive: boolean;
  rlsRoles?: string;
  allowedUserIds?: string;
  allowedRoleIds?: string;
}

export type UpdatePowerBIReportDefinitionDto = CreatePowerBIReportDefinitionDto;

export interface PowerBIReportDefinitionGetDto {
  id: number;
  name: string;
  description?: string;
  workspaceId: string;
  reportId: string;
  datasetId?: string;
  embedUrl?: string;
  isActive: boolean;
  rlsRoles?: string;
  allowedUserIds?: string;
  allowedRoleIds?: string;
  createdBy?: string;
  updatedBy?: string;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
}

export const powerbiReportDefinitionFormSchema = z.object({
  name: z.string().min(1, 'powerbi.reportDefinition.nameRequired').max(200, 'powerbi.reportDefinition.nameMaxLength'),
  description: z.string().max(500).optional().or(z.literal('')),
  workspaceId: z.string().uuid('powerbi.reportDefinition.workspaceIdInvalid'),
  reportId: z.string().uuid('powerbi.reportDefinition.reportIdInvalid'),
  datasetId: z.string().uuid('powerbi.reportDefinition.datasetIdInvalid').optional().or(z.literal('')),
  embedUrl: z.string().url('powerbi.reportDefinition.embedUrlInvalid').optional().or(z.literal('')),
  isActive: z.boolean(),
  rlsRoles: z.string().max(2000).optional().or(z.literal('')),
  allowedUserIds: z.string().max(2000).optional().or(z.literal('')),
  allowedRoleIds: z.string().max(2000).optional().or(z.literal('')),
});

export type PowerBIReportDefinitionFormSchema = z.infer<typeof powerbiReportDefinitionFormSchema>;
