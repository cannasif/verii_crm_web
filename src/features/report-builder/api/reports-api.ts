import { api } from '@/lib/axios';
import type { ReportDto, ReportPreviewRequest, ReportPreviewResponse, PreviewColumnDto, PreviewDataDto } from '../types';

const BASE = '/api/reportbuilder';

export interface ReportCreateUpdateBody {
  name: string;
  description?: string;
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
  configJson: string;
}

function normalizeReportItem(raw: Record<string, unknown>): ReportDto {
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    name: String(raw.name ?? raw.Name ?? ''),
    description: raw.description != null || raw.Description != null ? String(raw.description ?? raw.Description ?? '') : undefined,
    connectionKey: String(raw.connectionKey ?? raw.ConnectionKey ?? ''),
    dataSourceType: String(raw.dataSourceType ?? raw.DataSourceType ?? ''),
    dataSourceName: String(raw.dataSourceName ?? raw.DataSourceName ?? ''),
    configJson: String(raw.configJson ?? raw.ConfigJson ?? ''),
    createdAt: raw.createdAt != null || raw.CreatedAt != null || raw.createdDate != null || raw.CreatedDate != null
      ? String(raw.createdAt ?? raw.CreatedAt ?? raw.createdDate ?? raw.CreatedDate ?? '')
      : undefined,
    updatedAt: raw.updatedAt != null || raw.UpdatedAt != null || raw.updatedDate != null || raw.UpdatedDate != null
      ? String(raw.updatedAt ?? raw.UpdatedAt ?? raw.updatedDate ?? raw.UpdatedDate ?? '')
      : undefined,
    isDeleted: raw.isDeleted != null || raw.IsDeleted != null ? Boolean(raw.isDeleted ?? raw.IsDeleted) : undefined,
    canManage: raw.canManage != null || raw.CanManage != null ? Boolean(raw.canManage ?? raw.CanManage) : undefined,
    accessLevel:
      raw.accessLevel != null || raw.AccessLevel != null
        ? String(raw.accessLevel ?? raw.AccessLevel ?? '') as 'owner' | 'shared' | 'organization' | 'none'
        : undefined,
  };
}

function toReportList(res: unknown): ReportDto[] {
  let arr: unknown[] = [];
  if (Array.isArray(res)) arr = res;
  else {
    const obj = res as Record<string, unknown>;
    const data = obj?.data ?? obj?.Data;
    if (Array.isArray(data)) arr = data;
    else {
      const inner = data as Record<string, unknown> | undefined;
      arr = Array.isArray(inner?.items ?? inner?.Items) ? (inner?.items ?? inner?.Items) as unknown[] : [];
    }
  }
  return arr.map((item) =>
    typeof item === 'object' && item !== null ? normalizeReportItem(item as Record<string, unknown>) : { id: 0, name: '', connectionKey: '', dataSourceType: '', dataSourceName: '', configJson: '' }
  ).filter((r) => r.id > 0);
}

function toReportDetail(res: unknown): ReportDto {
  const obj = res as Record<string, unknown>;
  const data = obj?.data ?? obj?.Data;
  const raw = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : obj;
  return normalizeReportItem(raw);
}

export const reportsApi = {
  async list(search?: string): Promise<ReportDto[]> {
    const q = search != null && search !== '' ? `?search=${encodeURIComponent(search)}` : '';
    const res = await api.get<unknown>(`${BASE}${q}`);
    return toReportList(res);
  },

  async get(id: number): Promise<ReportDto> {
    const res = await api.get<unknown>(`${BASE}/${id}`);
    return toReportDetail(res);
  },

  async create(body: ReportCreateUpdateBody): Promise<ReportDto> {
    const res = await api.post<Record<string, unknown>>(BASE, body);
    return toReportDetail(res);
  },

  async update(id: number, body: ReportCreateUpdateBody): Promise<ReportDto> {
    const res = await api.put<Record<string, unknown>>(`${BASE}/${id}`, body);
    return toReportDetail(res);
  },

  remove(id: number): Promise<void> {
    return api.delete<void>(`${BASE}/${id}`);
  },

  async preview(payload: ReportPreviewRequest): Promise<ReportPreviewResponse> {
    const res = await api.post<{ data?: PreviewDataDto; Data?: PreviewDataDto }>(`${BASE}/preview`, payload);
    const payloadData = res?.data ?? res?.Data;
    const rawColumns = payloadData?.columns ?? [];
    const columnNames = rawColumns.map(
      (c: PreviewColumnDto | string) => (typeof c === 'string' ? c : String(c?.name ?? (c as { Name?: string }).Name ?? ''))
    );
    const rawRows = payloadData?.rows ?? [];
    const rows: unknown[][] = Array.isArray(rawRows)
      ? rawRows.map((row: unknown) =>
          Array.isArray(row) ? row : columnNames.map((col) => (row as Record<string, unknown>)[col])
        )
      : [];
    return { columns: columnNames, rows };
  },
};
