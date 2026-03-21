import { api } from '@/lib/axios';
import type { ConnectionDto, DataSourceCatalogItem, DataSourceCheckResponseDto, Field } from '../types';

const BASE = '/api/reportbuilder';

function normalizeField(raw: Record<string, unknown>): Field {
  return {
    name: String(raw.name ?? raw.Name ?? ''),
    displayName:
      raw.displayName != null || raw.DisplayName != null
        ? String(raw.displayName ?? raw.DisplayName ?? '')
        : undefined,
    semanticType:
      raw.semanticType != null || raw.SemanticType != null
        ? String(raw.semanticType ?? raw.SemanticType ?? '')
        : undefined,
    defaultAggregation:
      raw.defaultAggregation != null || raw.DefaultAggregation != null
        ? String(raw.defaultAggregation ?? raw.DefaultAggregation ?? '') as Field['defaultAggregation']
        : undefined,
    sqlType: String(raw.sqlType ?? raw.SqlType ?? ''),
    dotNetType: String(raw.dotNetType ?? raw.DotNetType ?? ''),
    isNullable: Boolean(raw.isNullable ?? raw.IsNullable ?? false),
  };
}

function schemaToFields(schema: unknown): Field[] {
  if (!Array.isArray(schema)) return [];
  return schema.map((item) =>
    typeof item === 'object' && item !== null ? normalizeField(item as Record<string, unknown>) : { name: '', sqlType: '', dotNetType: '', isNullable: false }
  );
}

function normalizeConnection(raw: Record<string, unknown>): ConnectionDto {
  return {
    key: String(raw.key ?? raw.Key ?? ''),
    label: raw.label != null || raw.Label != null ? String(raw.label ?? raw.Label ?? '') : undefined,
  };
}

function normalizeDataSourceCatalogItem(raw: Record<string, unknown>): DataSourceCatalogItem {
  return {
    schemaName: String(raw.schemaName ?? raw.SchemaName ?? 'dbo'),
    objectName: String(raw.objectName ?? raw.ObjectName ?? ''),
    fullName: String(raw.fullName ?? raw.FullName ?? ''),
    type: String(raw.type ?? raw.Type ?? ''),
    displayName: String(raw.displayName ?? raw.DisplayName ?? raw.fullName ?? raw.FullName ?? ''),
  };
}

function toConnectionList(list: unknown): ConnectionDto[] {
  const arr = Array.isArray(list)
    ? list
    : (list as { data?: unknown[] })?.data ?? (list as { Data?: unknown[] })?.Data ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((item) =>
    typeof item === 'object' && item !== null ? normalizeConnection(item as Record<string, unknown>) : { key: '' }
  ).filter((c) => c.key !== '');
}

export const reportingApi = {
  async getConnections(): Promise<ConnectionDto[]> {
    const res = await api.get<ConnectionDto[] | { data?: unknown[]; Data?: unknown[] }>(`${BASE}/connections`);
    return toConnectionList(res);
  },

  async checkDataSource(body: {
    connectionKey: string;
    type: string;
    name: string;
  }): Promise<{ exists: boolean; message?: string; schema: Field[] }> {
    const res = await api.post<DataSourceCheckResponseDto>(`${BASE}/datasources/check`, body);
    const schema = res?.schema ?? (res as { Schema?: unknown[] }).Schema ?? [];
    const schemaArr = Array.isArray(schema) ? schema : [];
    return {
      exists: Boolean(res?.exists ?? (res as { Exists?: boolean }).Exists ?? schemaArr.length > 0),
      message: String(res?.message ?? (res as { Message?: string }).Message ?? ''),
      schema: schemaToFields(schemaArr),
    };
  },

  async listDataSources(params: {
    connectionKey: string;
    type: string;
    search?: string;
  }): Promise<DataSourceCatalogItem[]> {
    const search = params.search?.trim();
    const q = new URLSearchParams({
      connectionKey: params.connectionKey,
      type: params.type,
    });
    if (search) q.set('search', search);
    const res = await api.get<unknown>(`${BASE}/datasources?${q.toString()}`);
    const obj = res as Record<string, unknown>;
    const arr = Array.isArray(obj?.data ?? obj?.Data) ? (obj.data ?? obj.Data) as unknown[] : Array.isArray(res) ? res as unknown[] : [];
    return arr
      .map((item) => (typeof item === 'object' && item !== null ? normalizeDataSourceCatalogItem(item as Record<string, unknown>) : null))
      .filter((item): item is DataSourceCatalogItem => item != null && item.fullName !== '');
  },
};
