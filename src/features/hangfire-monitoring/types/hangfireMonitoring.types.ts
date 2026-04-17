export interface HangfireStatsDto {
  enqueued: number;
  processing: number;
  scheduled: number;
  succeeded: number;
  failed: number;
  deleted: number;
  servers: number;
  queues: number;
  timestamp: string;
}

export interface HangfireJobItemDto {
  jobId: string;
  jobName: string;
  failedAt?: string;
  enqueuedAt?: string;
  state: string;
  reason?: string;
}

export interface HangfireFailedResponseDto {
  items: HangfireJobItemDto[];
  total: number;
  timestamp: string;
}

export interface HangfireDeadLetterResponseDto {
  queue: string;
  enqueued: number;
  total: number;
  items: HangfireJobItemDto[];
  timestamp: string;
}

export interface HangfireSuccessJobItemDto {
  jobId: string;
  recurringJobId?: string;
  jobName: string;
  finishedAt?: string;
  durationMs: number;
  queue?: string;
  retryCount: number;
}

export interface HangfireSuccessResponseDto {
  items: HangfireSuccessJobItemDto[];
  total: number;
  timestamp: string;
}

export interface HangfireRecurringJobItemDto {
  id: string;
  jobName: string;
  method?: string;
  cron?: string;
  queue?: string;
  nextExecution?: string;
  lastExecution?: string;
  lastJobId?: string;
  error?: string;
}

export interface HangfireRecurringJobsResponseDto {
  items: HangfireRecurringJobItemDto[];
  total: number;
  timestamp: string;
}

export interface HangfireTriggerRecurringJobResponseDto {
  jobId: string;
  triggeredAt: string;
  message: string;
}
