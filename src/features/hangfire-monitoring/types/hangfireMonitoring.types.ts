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
  items: HangfireJobItemDto[];
  timestamp: string;
}
