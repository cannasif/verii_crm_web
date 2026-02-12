export const DEFAULT_API_BASE_URL = 'http://localhost:5001';

interface RuntimeConfig {
  apiUrl?: string;
}

function isValidApiUrl(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

let cachedApiUrl = normalizeBaseUrl(DEFAULT_API_BASE_URL);
let configPromise: Promise<string> | null = null;

async function fetchRuntimeConfig(): Promise<string> {
  const envUrl = import.meta.env.VITE_API_URL;
  if (isValidApiUrl(envUrl)) return normalizeBaseUrl(envUrl);

  try {
    const response = await fetch('/config.json', {
      cache: import.meta.env.PROD ? 'no-cache' : 'default',
    });
    if (!response.ok) return DEFAULT_API_BASE_URL;
    const config = (await response.json()) as RuntimeConfig;
    if (isValidApiUrl(config?.apiUrl)) return normalizeBaseUrl(config.apiUrl!);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[api-config] config.json yüklenemedi, fallback kullanılıyor:', error);
    }
  }
  return normalizeBaseUrl(DEFAULT_API_BASE_URL);
}

export function loadConfig(): Promise<string> {
  if (!configPromise) {
    configPromise = fetchRuntimeConfig().then((url) => {
      cachedApiUrl = url;
      return url;
    });
  }
  return configPromise;
}

export async function getApiUrl(): Promise<string> {
  return loadConfig();
}

export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (isValidApiUrl(env)) return normalizeBaseUrl(env);
  return cachedApiUrl || normalizeBaseUrl(DEFAULT_API_BASE_URL);
}
