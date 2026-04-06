import { api } from '@/lib/axios';
import type { ConnectionDto, DataSourceCatalogItem, DataSourceCheckResponseDto, DataSourceParameter, Field } from '../types';

const BASE = '/api/reportbuilder';

function humanizeIdentifier(value: string): string {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return value;

  const upperWords = new Set(['id', 'erp', 'crm', 'pdf', 'api', 'sql', 'tl', 'usd', 'eur', 'no']);

  return normalized
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase();
      if (upperWords.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function normalizeField(raw: Record<string, unknown>): Field {
  const name = String(raw.name ?? raw.Name ?? '');
  const providedDisplayName =
    raw.displayName != null || raw.DisplayName != null
      ? String(raw.displayName ?? raw.DisplayName ?? '')
      : undefined;
  const semanticType =
    raw.semanticType != null || raw.SemanticType != null
      ? String(raw.semanticType ?? raw.SemanticType ?? '')
      : undefined;
  const rawDefaultAggregation =
    raw.defaultAggregation != null || raw.DefaultAggregation != null
      ? String(raw.defaultAggregation ?? raw.DefaultAggregation ?? '') as Field['defaultAggregation']
      : undefined;

  const inferDefaultAggregation = (): Field['defaultAggregation'] | undefined => {
    if (rawDefaultAggregation) return rawDefaultAggregation;
    if (semanticType !== 'number') return undefined;
    const haystack = `${name} ${providedDisplayName ?? ''}`.toLowerCase();
    if (/(^|[\s_.-])(id|code|no|number|key)([\s_.-]|$)|guid|status|type/.test(haystack)) return 'count';
    if (/oran|rate|percent|percentage|average|avg/.test(haystack)) return 'avg';
    return 'sum';
  };

  return {
    name,
    displayName: providedDisplayName && providedDisplayName.trim() ? providedDisplayName : humanizeIdentifier(name),
    semanticType,
    defaultAggregation: inferDefaultAggregation(),
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

function normalizeParameter(raw: Record<string, unknown>): DataSourceParameter {
  const name = String(raw.name ?? raw.Name ?? '');
  const providedDisplayName =
    raw.displayName != null || raw.DisplayName != null
      ? String(raw.displayName ?? raw.DisplayName ?? '')
      : undefined;

  return {
    name,
    displayName: providedDisplayName && providedDisplayName.trim() ? providedDisplayName : humanizeIdentifier(name),
    semanticType:
      raw.semanticType != null || raw.SemanticType != null
        ? String(raw.semanticType ?? raw.SemanticType ?? '')
        : undefined,
    sqlType: String(raw.sqlType ?? raw.SqlType ?? ''),
    dotNetType: String(raw.dotNetType ?? raw.DotNetType ?? ''),
    isNullable: Boolean(raw.isNullable ?? raw.IsNullable ?? false),
  };
}

function toParameters(list: unknown): DataSourceParameter[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === 'object' && item !== null ? normalizeParameter(item as Record<string, unknown>) : null))
    .filter((item): item is DataSourceParameter => item != null && item.name !== '');
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
  }): Promise<{ exists: boolean; message?: string; schema: Field[]; parameters: DataSourceParameter[] }> {
    const res = await api.post<DataSourceCheckResponseDto>(`${BASE}/datasources/check`, body);
    const schema = res?.schema ?? (res as { Schema?: unknown[] }).Schema ?? [];
    const parameters = res?.parameters ?? (res as { Parameters?: unknown[] }).Parameters ?? [];
    const schemaArr = Array.isArray(schema) ? schema : [];
    return {
      exists: Boolean(res?.exists ?? (res as { Exists?: boolean }).Exists ?? schemaArr.length > 0),
      message: String(res?.message ?? (res as { Message?: string }).Message ?? ''),
      schema: schemaToFields(schemaArr),
      parameters: toParameters(parameters),
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
