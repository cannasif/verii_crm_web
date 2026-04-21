type PerfMetricRecord = {
  name: string;
  duration: number;
  startTime: number;
  detail?: string;
};

declare global {
  interface Window {
    __crmPerfMetrics?: PerfMetricRecord[];
  }
}

const METRIC_STORE_LIMIT = 200;

function isPerfSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.performance !== 'undefined';
}

function pushMetric(record: PerfMetricRecord): void {
  if (typeof window === 'undefined') return;
  const existing = window.__crmPerfMetrics ?? [];
  const next = [...existing, record].slice(-METRIC_STORE_LIMIT);
  window.__crmPerfMetrics = next;
}

export function perfMark(name: string): void {
  if (!isPerfSupported()) return;
  window.performance.mark(name);
}

export function perfMeasure(name: string, startMark: string, endMark: string, detail?: string): number | null {
  if (!isPerfSupported()) return null;

  try {
    window.performance.measure(name, startMark, endMark);
    const entries = window.performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];
    if (!entry) return null;

    const record: PerfMetricRecord = {
      name,
      duration: entry.duration,
      startTime: entry.startTime,
      detail,
    };
    pushMetric(record);
    console.info(`[perf] ${name}: ${entry.duration.toFixed(2)} ms${detail ? ` (${detail})` : ''}`);
    return entry.duration;
  } catch {
    return null;
  }
}

export function perfMeasureOnNextPaint(name: string, startMark: string, detail?: string): void {
  if (!isPerfSupported()) return;

  const endMark = `${name}:end`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      perfMark(endMark);
      perfMeasure(name, startMark, endMark, detail);
    });
  });
}

export function clearPerfMarks(...names: string[]): void {
  if (!isPerfSupported()) return;
  names.forEach((name) => {
    try {
      window.performance.clearMarks(name);
      window.performance.clearMeasures(name);
    } catch {
      // no-op
    }
  });
}
