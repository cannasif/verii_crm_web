import { getApiBaseUrl } from '@/lib/axios';

export const getImageUrl = (relativePath: string | null | undefined): string | null => {
  if (!relativePath) return null;

  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('data:')) {
    return relativePath;
  }

  const cleanBaseURL = getApiBaseUrl().replace(/\/$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return `${cleanBaseURL}${cleanPath}`;
};
