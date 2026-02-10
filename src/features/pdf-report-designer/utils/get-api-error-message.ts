import { isAxiosError } from 'axios';

export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err) && err.response?.data != null) {
    const data = err.response.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first != null && 'message' in first)
        return String((first as { message: unknown }).message);
    }
    try {
      return JSON.stringify(data);
    } catch {
      return err.message ?? String(err);
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
