import { api } from '@/lib/axios';
import type {
  HangfireDeadLetterResponseDto,
  HangfireFailedResponseDto,
  HangfireStatsDto,
} from '../types/hangfireMonitoring.types';

function normalizeStats(data: Record<string, unknown>): HangfireStatsDto {
  return {
    enqueued: Number(data.Enqueued ?? 0),
    processing: Number(data.Processing ?? 0),
    scheduled: Number(data.Scheduled ?? 0),
    succeeded: Number(data.Succeeded ?? 0),
    failed: Number(data.Failed ?? 0),
    deleted: Number(data.Deleted ?? 0),
    servers: Number(data.Servers ?? 0),
    queues: Number(data.Queues ?? 0),
    timestamp: String(data.Timestamp ?? new Date().toISOString()),
  };
}

function normalizeJobs(items: unknown): HangfireFailedResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;

    return {
      jobId: String(row.JobId ?? ''),
      jobName: String(row.JobName ?? 'unknown'),
      failedAt: row.FailedAt != null ? String(row.FailedAt) : undefined,
      enqueuedAt: row.EnqueuedAt != null ? String(row.EnqueuedAt) : undefined,
      state: String(row.State ?? ''),
      reason: row.Reason != null ? String(row.Reason) : undefined,
    };
  });
}

export const hangfireMonitoringApi = {
  async getStats(): Promise<HangfireStatsDto> {
    const response = await api.get<Record<string, unknown>>('/api/hangfire/stats');
    return normalizeStats(response ?? {});
  },

  async getFailed(from = 0, count = 20): Promise<HangfireFailedResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/failed?from=${from}&count=${count}`);
    return {
      items: normalizeJobs(response?.Items),
      total: Number(response?.Total ?? 0),
      timestamp: String(response?.Timestamp ?? new Date().toISOString()),
    };
  },

  async getDeadLetter(from = 0, count = 20): Promise<HangfireDeadLetterResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/dead-letter?from=${from}&count=${count}`);
    return {
      queue: String(response?.Queue ?? 'dead-letter'),
      enqueued: Number(response?.Enqueued ?? 0),
      items: normalizeJobs(response?.Items),
      timestamp: String(response?.Timestamp ?? new Date().toISOString()),
    };
  },
};
