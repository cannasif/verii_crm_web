export function isFresh(lastFetchedAt: number | null | undefined, ttlMs: number): boolean {
  if (!lastFetchedAt || ttlMs <= 0) return false;
  return Date.now() - lastFetchedAt < ttlMs;
}
