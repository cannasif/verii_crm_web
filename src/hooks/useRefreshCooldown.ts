import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRefreshCooldownOptions {
  onRefresh: () => void | Promise<void>;
  cooldownSeconds?: number;
  disabled?: boolean;
}

interface UseRefreshCooldownResult {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  isCoolingDown: boolean;
  remainingSeconds: number;
  isDisabled: boolean;
}

export function useRefreshCooldown({
  onRefresh,
  cooldownSeconds = 30,
  disabled = false,
}: UseRefreshCooldownOptions): UseRefreshCooldownResult {
  const onRefreshRef = useRef(onRefresh);
  const blockedUntilRef = useRef(0);
  const inFlightRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (blockedUntil <= Date.now()) return;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= blockedUntil) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  const remainingSeconds = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
  const isCoolingDown = remainingSeconds > 0;

  const refresh = useCallback(async (): Promise<void> => {
    const currentTime = Date.now();
    if (disabled || inFlightRef.current || currentTime < blockedUntilRef.current) return;

    const cooldownMilliseconds = Math.max(cooldownSeconds, 0) * 1000;
    const nextBlockedUntil = currentTime + cooldownMilliseconds;
    inFlightRef.current = true;
    blockedUntilRef.current = nextBlockedUntil;
    setBlockedUntil(nextBlockedUntil);
    setNow(currentTime);
    setIsRefreshing(true);

    try {
      await onRefreshRef.current();
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [cooldownSeconds, disabled]);

  return {
    refresh,
    isRefreshing,
    isCoolingDown,
    remainingSeconds,
    isDisabled: disabled || isRefreshing || isCoolingDown,
  };
}
