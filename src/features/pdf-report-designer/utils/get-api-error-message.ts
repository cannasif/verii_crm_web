import { isAxiosError } from 'axios';
import { extractPdfTemplateApiErrorStrings } from './validate-pdf-template';

export function getApiErrorMessage(err: unknown): string {
  const specificErrors = extractPdfTemplateApiErrorStrings(err);
  if (specificErrors.length > 0) return specificErrors.join(' ');

  if (isAxiosError(err) && err.response?.data != null) {
    const data = err.response.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    try {
      return JSON.stringify(data);
    } catch {
      return err.message ?? String(err);
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
