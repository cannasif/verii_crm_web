import { api } from '@/lib/axios';
import type {
  HangfireDeadLetterResponseDto,
  HangfireFailedResponseDto,
  HangfireRecurringJobsResponseDto,
  HangfireSuccessResponseDto,
  HangfireTriggerRecurringJobResponseDto,
  HangfireStatsDto,
} from '../types/hangfireMonitoring.types';

function pick<T>(data: Record<string, unknown> | null | undefined, pascalKey: string, camelKey: string): T | undefined {
  if (!data) return undefined;
  return (data[pascalKey] ?? data[camelKey]) as T | undefined;
}

function normalizeStats(data: Record<string, unknown>): HangfireStatsDto {
  return {
    enqueued: Number(pick<number>(data, 'Enqueued', 'enqueued') ?? 0),
    processing: Number(pick<number>(data, 'Processing', 'processing') ?? 0),
    scheduled: Number(pick<number>(data, 'Scheduled', 'scheduled') ?? 0),
    succeeded: Number(pick<number>(data, 'Succeeded', 'succeeded') ?? 0),
    failed: Number(pick<number>(data, 'Failed', 'failed') ?? 0),
    deleted: Number(pick<number>(data, 'Deleted', 'deleted') ?? 0),
    servers: Number(pick<number>(data, 'Servers', 'servers') ?? 0),
    queues: Number(pick<number>(data, 'Queues', 'queues') ?? 0),
    timestamp: String(pick<string>(data, 'Timestamp', 'timestamp') ?? new Date().toISOString()),
  };
}

function normalizeJobs(items: unknown): HangfireFailedResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;

    return {
      jobId: String(pick<string>(row, 'JobId', 'jobId') ?? ''),
      jobName: String(pick<string>(row, 'JobName', 'jobName') ?? 'unknown'),
      failedAt: pick<string>(row, 'FailedAt', 'failedAt') != null ? String(pick<string>(row, 'FailedAt', 'failedAt')) : undefined,
      enqueuedAt: pick<string>(row, 'EnqueuedAt', 'enqueuedAt') != null ? String(pick<string>(row, 'EnqueuedAt', 'enqueuedAt')) : undefined,
      state: String(pick<string>(row, 'State', 'state') ?? ''),
      reason: pick<string>(row, 'Reason', 'reason') != null ? String(pick<string>(row, 'Reason', 'reason')) : undefined,
    };
  });
}

function normalizeSuccessJobs(items: unknown): HangfireSuccessResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;

    return {
      jobId: String(pick<string>(row, 'JobId', 'jobId') ?? ''),
      recurringJobId: pick<string>(row, 'RecurringJobId', 'recurringJobId') != null
        ? String(pick<string>(row, 'RecurringJobId', 'recurringJobId'))
        : undefined,
      jobName: String(pick<string>(row, 'JobName', 'jobName') ?? 'unknown'),
      finishedAt: pick<string>(row, 'FinishedAt', 'finishedAt') != null
        ? String(pick<string>(row, 'FinishedAt', 'finishedAt'))
        : undefined,
      durationMs: Number(pick<number>(row, 'DurationMs', 'durationMs') ?? 0),
      queue: pick<string>(row, 'Queue', 'queue') != null
        ? String(pick<string>(row, 'Queue', 'queue'))
        : undefined,
      retryCount: Number(pick<number>(row, 'RetryCount', 'retryCount') ?? 0),
    };
  });
}

function normalizeRecurringJobs(items: unknown): HangfireRecurringJobsResponseDto['items'] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(pick<string>(row, 'Id', 'id') ?? ''),
      jobName: String(pick<string>(row, 'JobName', 'jobName') ?? pick<string>(row, 'Id', 'id') ?? 'unknown'),
      method: pick<string>(row, 'Method', 'method') != null ? String(pick<string>(row, 'Method', 'method')) : undefined,
      cron: pick<string>(row, 'Cron', 'cron') != null ? String(pick<string>(row, 'Cron', 'cron')) : undefined,
      queue: pick<string>(row, 'Queue', 'queue') != null ? String(pick<string>(row, 'Queue', 'queue')) : undefined,
      nextExecution: pick<string>(row, 'NextExecution', 'nextExecution') != null ? String(pick<string>(row, 'NextExecution', 'nextExecution')) : undefined,
      lastExecution: pick<string>(row, 'LastExecution', 'lastExecution') != null ? String(pick<string>(row, 'LastExecution', 'lastExecution')) : undefined,
      lastJobId: pick<string>(row, 'LastJobId', 'lastJobId') != null ? String(pick<string>(row, 'LastJobId', 'lastJobId')) : undefined,
      error: pick<string>(row, 'Error', 'error') != null ? String(pick<string>(row, 'Error', 'error')) : undefined,
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
      items: normalizeJobs(pick<unknown>(response, 'Items', 'items')),
      total: Number(pick<number>(response, 'Total', 'total') ?? 0),
      timestamp: String(pick<string>(response, 'Timestamp', 'timestamp') ?? new Date().toISOString()),
    };
  },

  async getDeadLetter(from = 0, count = 20): Promise<HangfireDeadLetterResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/dead-letter?from=${from}&count=${count}`);
    const total = Number(pick<number>(response, 'Enqueued', 'enqueued') ?? 0);
    return {
      queue: String(pick<string>(response, 'Queue', 'queue') ?? 'dead-letter'),
      enqueued: total,
      total,
      items: normalizeJobs(pick<unknown>(response, 'Items', 'items')),
      timestamp: String(pick<string>(response, 'Timestamp', 'timestamp') ?? new Date().toISOString()),
    };
  },

  async getSuccesses(from = 0, count = 20): Promise<HangfireSuccessResponseDto> {
    const response = await api.get<Record<string, unknown>>(`/api/hangfire/successes-from-db?from=${from}&count=${count}`);
    return {
      items: normalizeSuccessJobs(pick<unknown>(response, 'Items', 'items')),
      total: Number(pick<number>(response, 'Total', 'total') ?? 0),
      timestamp: String(pick<string>(response, 'Timestamp', 'timestamp') ?? new Date().toISOString()),
    };
  },

  async getRecurringJobs(): Promise<HangfireRecurringJobsResponseDto> {
    const response = await api.get<Record<string, unknown>>('/api/hangfire/recurring-jobs');
    return {
      items: normalizeRecurringJobs(pick<unknown>(response, 'Items', 'items')),
      total: Number(pick<number>(response, 'Total', 'total') ?? 0),
      timestamp: String(pick<string>(response, 'Timestamp', 'timestamp') ?? new Date().toISOString()),
    };
  },

  async triggerRecurringJob(jobId: string): Promise<HangfireTriggerRecurringJobResponseDto> {
    const response = await api.post<Record<string, unknown>>(`/api/hangfire/recurring-jobs/${encodeURIComponent(jobId)}/trigger`);
    return {
      jobId: String(pick<string>(response, 'JobId', 'jobId') ?? jobId),
      triggeredAt: String(pick<string>(response, 'TriggeredAt', 'triggeredAt') ?? new Date().toISOString()),
      message: String(pick<string>(response, 'Message', 'message') ?? 'Recurring job triggered successfully.'),
    };
  },
};
