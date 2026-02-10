export function isApiSuccess(response: unknown): boolean {
  if (response == null || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  return r.success === true || r.Success === true;
}

export function getApiData<T>(response: unknown): T | null {
  if (response == null || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  return (r.data ?? r.Data ?? null) as T | null;
}

export function unwrapApiResponse<T>(response: unknown): T {
  if (!isApiSuccess(response)) {
    const r = response as Record<string, unknown>;
    const msg = (r.message ?? r.Message ?? 'İstek başarısız') as string;
    throw new Error(msg);
  }
  const data = getApiData<T>(response);
  if (data == null) throw new Error('Yanıt verisi bulunamadı');
  return data;
}
