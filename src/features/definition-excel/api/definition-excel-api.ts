import { api } from '@/lib/axios';

export type DefinitionExcelImportStatus = 'Queued' | 'Running' | 'Completed' | 'CompletedWithErrors' | 'Failed';

export interface DefinitionExcelImportQueuedDto {
  importJobId: number;
  hangfireJobId?: string | null;
  status: DefinitionExcelImportStatus;
  message?: string | null;
}

export interface DefinitionExcelImportJobDto {
  id: number;
  definitionKey: string;
  definitionName: string;
  originalFileName?: string | null;
  status: DefinitionExcelImportStatus;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  restoredRows: number;
  failedRows: number;
  errorMessage?: string | null;
  hasResultFile: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdDate?: string | null;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  success?: boolean;
}

export interface DefinitionExcelTemplateTheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  muted?: string;
}

function unwrap<T>(response: ApiResponse<T> | T): T {
  const payload = response as ApiResponse<T>;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return response as T;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const definitionExcelApi = {
  async downloadTemplate(definitionKey: string, fileName: string, theme?: DefinitionExcelTemplateTheme): Promise<void> {
    const response = await api.get<Blob>(`/api/definition-excel/${definitionKey}/template`, {
      responseType: 'blob',
      params: theme,
    });
    downloadBlob(response as unknown as Blob, fileName);
  },

  async queueImport(definitionKey: string, file: File): Promise<DefinitionExcelImportQueuedDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<DefinitionExcelImportQueuedDto>>(
      `/api/definition-excel/${definitionKey}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return unwrap<DefinitionExcelImportQueuedDto>(response);
  },

  async getJob(jobId: number): Promise<DefinitionExcelImportJobDto> {
    const response = await api.get<ApiResponse<DefinitionExcelImportJobDto>>(`/api/definition-excel/jobs/${jobId}`);
    return unwrap<DefinitionExcelImportJobDto>(response);
  },

  async getJobs(definitionKey: string): Promise<DefinitionExcelImportJobDto[]> {
    const response = await api.get<ApiResponse<DefinitionExcelImportJobDto[]>>('/api/definition-excel/jobs', {
      params: { definitionKey },
    });
    return unwrap<DefinitionExcelImportJobDto[]>(response);
  },

  async downloadResult(jobId: number, fileName: string): Promise<void> {
    const response = await api.get<Blob>(`/api/definition-excel/jobs/${jobId}/result`, {
      responseType: 'blob',
    });
    downloadBlob(response as unknown as Blob, fileName);
  },
};
