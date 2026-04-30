import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse } from '@/types/api';
import type {
  WindoDefinitionCreateDto,
  WindoDefinitionGetDto,
  WindoDefinitionUpdateDto,
} from '../types/windo-definition-types';

async function getDefinitionList(path: string): Promise<WindoDefinitionGetDto[]> {
  const response = await api.get<ApiResponse<PagedResponse<WindoDefinitionGetDto> & { items?: WindoDefinitionGetDto[]; data?: WindoDefinitionGetDto[] }>>(
    `${path}?pageNumber=1&pageSize=500&sortBy=Name&sortDirection=asc`
  );

  if (response.success && response.data) {
    return response.data.items ?? response.data.data ?? [];
  }

  throw new Error(response.message || 'Tanımlar yüklenemedi');
}

async function createDefinition(path: string, data: WindoDefinitionCreateDto): Promise<WindoDefinitionGetDto> {
  const response = await api.post<ApiResponse<WindoDefinitionGetDto>>(path, data);
  if (response.success && response.data) return response.data;
  throw new Error(response.message || 'Tanım oluşturulamadı');
}

async function updateDefinition(path: string, id: number, data: WindoDefinitionUpdateDto): Promise<WindoDefinitionGetDto> {
  const response = await api.put<ApiResponse<WindoDefinitionGetDto>>(`${path}/${id}`, data);
  if (response.success && response.data) return response.data;
  throw new Error(response.message || 'Tanım güncellenemedi');
}

async function deleteDefinition(path: string, id: number): Promise<void> {
  const response = await api.delete<ApiResponse<object>>(`${path}/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Tanım silinemedi');
  }
}

export const windoDefinitionApi = {
  getProfilList: () => getDefinitionList('/api/ProfilDefinition'),
  getDemirList: () => getDefinitionList('/api/DemirDefinition'),
  getVidaList: () => getDefinitionList('/api/VidaDefinition'),
  createProfil: (data: WindoDefinitionCreateDto) => createDefinition('/api/ProfilDefinition', data),
  createDemir: (data: WindoDefinitionCreateDto) => createDefinition('/api/DemirDefinition', data),
  createVida: (data: WindoDefinitionCreateDto) => createDefinition('/api/VidaDefinition', data),
  updateProfil: (id: number, data: WindoDefinitionUpdateDto) => updateDefinition('/api/ProfilDefinition', id, data),
  updateDemir: (id: number, data: WindoDefinitionUpdateDto) => updateDefinition('/api/DemirDefinition', id, data),
  updateVida: (id: number, data: WindoDefinitionUpdateDto) => updateDefinition('/api/VidaDefinition', id, data),
  deleteProfil: (id: number) => deleteDefinition('/api/ProfilDefinition', id),
  deleteDemir: (id: number) => deleteDefinition('/api/DemirDefinition', id),
  deleteVida: (id: number) => deleteDefinition('/api/VidaDefinition', id),
};
