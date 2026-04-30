export interface WindoDefinitionGetDto {
  id: number;
  name: string;
  createdDate?: string | null;
  updatedDate?: string | null;
}

export interface WindoDefinitionCreateDto {
  name: string;
}

export type WindoDefinitionUpdateDto = WindoDefinitionCreateDto;

export interface WindoDefinitionOption {
  id: number;
  name: string;
}
