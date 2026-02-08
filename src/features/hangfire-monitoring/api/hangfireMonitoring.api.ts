import { api } from '@/lib/axios';
import type {
  HangfireDeadLetterResponseDto,
  HangfireFailedResponseDto,
  HangfireStatsDto,
} from '../types/hangfireMonitoring.types';

function normalizeStats(data: Record<string, unknown>): HangfireStatsDto {
  return {
    enqueued: Number(data.Enqueued ?? data.enqueued ?? 0),
    processing: Number(data.Processing ?? data.processing ?? 0),
    scheduled: Number(data.Scheduled ?? data.scheduled ?? 0),
    succeeded: Number(data.Succeeded ?? data.succeeded ?? 0),
    failed: Number(data.Failed ?? data.failed ?? 0),
    deleted: Number(data.Deleted ?? data.deleted ?? 0),
    servers: Number(data.Servers ?? data.servers ?? 0),
    queues: Number(data.Queues ?? data.queues ?? 0),
    timestamp: String(data.Timestamp ?? data.timestamp ?? new Date().toISOString()),
  };
}

function normalizeJobs(items: unknown): HangfireFailedResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      jobId: String(row.JobId ?? row.jobId ?? ''),
      jobName: String(row.JobName ?? row.jobName ?? 'unknown'),
      failedAt: row.FailedAt ? String(row.FailedAt) : undefined,
      enqueuedAt: row.EnqueuedAt ? String(row.EnqueuedAt) : undefined,
      state: String(row.State ?? row.state ?? ''),
      reason: row.Reason ? String(row.Reason) : undefined,
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
      items: normalizeJobs(response?.Items ?? response?.items),
      total: Number(response?.Total ?? response?.total ?? 0),
      timestamp: String(response?.Timestamp ?? response?.timestamp ?? new Date().toISOString()),
    };
  },

  async getDeadLetter(from = 0, count = 20): Promise<HangfireDeadLetterResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/dead-letter?from=${from}&count=${count}`);
    return {
      queue: String(response?.Queue ?? response?.queue ?? 'dead-letter'),
      enqueued: Number(response?.Enqueued ?? response?.enqueued ?? 0),
      items: normalizeJobs(response?.Items ?? response?.items),
      timestamp: String(response?.Timestamp ?? response?.timestamp ?? new Date().toISOString()),
    };
  },
};
