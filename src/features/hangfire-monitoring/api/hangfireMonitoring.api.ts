import { api } from '@/lib/axios';
import type {
  HangfireDeadLetterResponseDto,
  HangfireFailedResponseDto,
  HangfireRecurringJobsResponseDto,
  HangfireTriggerRecurringJobResponseDto,
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

function normalizeRecurringJobs(items: unknown): HangfireRecurringJobsResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(row.Id ?? ''),
      jobName: String(row.JobName ?? row.Id ?? 'unknown'),
      method: row.Method != null ? String(row.Method) : undefined,
      cron: row.Cron != null ? String(row.Cron) : undefined,
      queue: row.Queue != null ? String(row.Queue) : undefined,
      nextExecution: row.NextExecution != null ? String(row.NextExecution) : undefined,
      lastExecution: row.LastExecution != null ? String(row.LastExecution) : undefined,
      lastJobId: row.LastJobId != null ? String(row.LastJobId) : undefined,
      error: row.Error != null ? String(row.Error) : undefined,
    };
  });
}

export const hangfireMonitoringApi = {
  async getStats(): Promise<HangfireStatsDto> {
    const response = await api.get<Record<string, unknown>>('/api/hangfire/stats');
    return normalizeStats(response ?? {});
  },

  async getFailed(from = 0, count = 20): Promise<HangfireFailedResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/failures-from-db?from=${from}&count=${count}`);
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

  async getRecurringJobs(): Promise<HangfireRecurringJobsResponseDto> {
    const response = await api.get<Record<string, unknown>>('/api/hangfire/recurring-jobs');
    return {
      items: normalizeRecurringJobs(response?.Items),
      total: Number(response?.Total ?? 0),
      timestamp: String(response?.Timestamp ?? new Date().toISOString()),
    };
  },

  async triggerRecurringJob(jobId: string): Promise<HangfireTriggerRecurringJobResponseDto> {
    const response = await api.post<Record<string, unknown>>(`/api/hangfire/recurring-jobs/${encodeURIComponent(jobId)}/trigger`);
    return {
      jobId: String(response?.JobId ?? jobId),
      triggeredAt: String(response?.TriggeredAt ?? new Date().toISOString()),
      message: String(response?.Message ?? 'Recurring job triggered successfully.'),
    };
  },
};
