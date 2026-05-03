export interface WindoDefinitionGetDto {
  id: number;
  name: string;
  profilDefinitionId?: number | null;
  profilDefinitionName?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
}

export interface WindoDefinitionCreateDto {
  name: string;
  profilDefinitionId?: number | null;
}

export type WindoDefinitionUpdateDto = WindoDefinitionCreateDto;

export interface WindoDefinitionOption {
  id: number;
  name: string;
  profilDefinitionId?: number | null;
  profilDefinitionName?: string | null;
}
