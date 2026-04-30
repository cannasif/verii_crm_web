import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  WindoDefinitionCreateDto,
  WindoDefinitionGetDto,
  WindoDefinitionUpdateDto,
} from '../types/windo-definition-types';

function buildPagedQuery(params: PagedParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.pageNumber) searchParams.set('pageNumber', String(params.pageNumber));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.sortBy?.trim()) searchParams.set('sortBy', params.sortBy.trim());
  if (params.sortDirection?.trim()) searchParams.set('sortDirection', params.sortDirection.trim());

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function getDefinitionPagedList(path: string, params: PagedParams = {}): Promise<PagedResponse<WindoDefinitionGetDto>> {
  const response = await api.get<ApiResponse<PagedResponse<WindoDefinitionGetDto>>>(
    `${path}${buildPagedQuery(params)}`
  );

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Tanımlar yüklenemedi');
}

async function getDefinitionList(path: string): Promise<WindoDefinitionGetDto[]> {
  const response = await getDefinitionPagedList(path, {
    pageNumber: 1,
    pageSize: 500,
    sortBy: 'Name',
    sortDirection: 'asc',
  });

  return response.data ?? [];
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
  getProfilPagedList: (params?: PagedParams) => getDefinitionPagedList('/api/ProfilDefinition', params),
  getDemirPagedList: (params?: PagedParams) => getDefinitionPagedList('/api/DemirDefinition', params),
  getVidaPagedList: (params?: PagedParams) => getDefinitionPagedList('/api/VidaDefinition', params),
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
