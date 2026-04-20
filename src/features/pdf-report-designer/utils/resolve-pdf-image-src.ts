import { getApiBaseUrl } from '@/lib/api-config';

export function resolvePdfImageSrc(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return trimmedValue;

  if (trimmedValue.startsWith('data:') || /^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (trimmedValue.startsWith('/')) {
    return `${apiBaseUrl}${trimmedValue}`;
  }

  return `${apiBaseUrl}/${trimmedValue.replace(/^\/+/, '')}`;
}
