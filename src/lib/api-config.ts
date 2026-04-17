export const DEFAULT_API_BASE_URL = 'https://crmapi.v3rii.com';
const RUNTIME_CONFIG_CACHE_KEY = 'runtime-config-cache';
const RUNTIME_CONFIG_TTL_MS = 60 * 60 * 1000;

interface RuntimeConfig {
  apiUrl?: string;
  baseUrl?: string;
}

interface ResolvedRuntimeConfig {
  apiUrl: string;
  baseUrl: string;
}

interface PersistedRuntimeConfig {
  apiUrl: string;
  baseUrl: string;
  fetchedAt: number;
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

function normalizeAppBasePath(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const normalizedPath = url.pathname.trim();
      if (!normalizedPath || normalizedPath === '/') {
        return '/';
      }

      return `/${normalizedPath.replace(/^\/+|\/+$/g, '')}`;
    }
  } catch {
    return '/';
  }

  if (trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

let cachedApiUrl = normalizeBaseUrl(DEFAULT_API_BASE_URL);
let cachedAppBasePath = normalizeAppBasePath(import.meta.env.BASE_URL || '/');
let configPromise: Promise<ResolvedRuntimeConfig> | null = null;
let backgroundRefreshPromise: Promise<void> | null = null;
const runtimeBasePath = import.meta.env.BASE_URL || '/';

function toBaseRelativePath(fileName: string): string {
  const normalizedBase = runtimeBasePath.endsWith('/') ? runtimeBasePath : `${runtimeBasePath}/`;
  return `${normalizedBase}${fileName}`;
}

async function fetchRuntimeConfig(): Promise<ResolvedRuntimeConfig> {
  const envUrl = import.meta.env.VITE_API_URL;
  const fallbackConfig: ResolvedRuntimeConfig = {
    apiUrl: isValidApiUrl(envUrl) ? normalizeBaseUrl(envUrl) : normalizeBaseUrl(DEFAULT_API_BASE_URL),
    baseUrl: normalizeAppBasePath(import.meta.env.BASE_URL || '/'),
  };

  try {
    const response = await fetch(toBaseRelativePath('config.json'), {
      cache: import.meta.env.PROD ? 'no-cache' : 'default',
    });
    if (!response.ok) return fallbackConfig;
    const config = (await response.json()) as RuntimeConfig;

    return {
      apiUrl: isValidApiUrl(config?.apiUrl) ? normalizeBaseUrl(config.apiUrl!) : fallbackConfig.apiUrl,
      baseUrl: normalizeAppBasePath(config?.baseUrl ?? fallbackConfig.baseUrl),
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[api-config] config.json yüklenemedi, fallback kullanılıyor:', error);
    }
  }

  return fallbackConfig;
}

function readPersistedRuntimeConfig(): PersistedRuntimeConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedRuntimeConfig>;
    if (
      !isValidApiUrl(parsed.apiUrl) ||
      typeof parsed.baseUrl !== 'string' ||
      typeof parsed.fetchedAt !== 'number'
    ) {
      return null;
    }

    const apiUrl = parsed.apiUrl as string;
    const baseUrl = parsed.baseUrl as string;

    return {
      apiUrl: normalizeBaseUrl(apiUrl),
      baseUrl: normalizeAppBasePath(baseUrl),
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    return null;
  }
}

function persistRuntimeConfig(config: ResolvedRuntimeConfig): void {
  if (typeof window === 'undefined') return;

  const payload: PersistedRuntimeConfig = {
    apiUrl: config.apiUrl,
    baseUrl: config.baseUrl,
    fetchedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(RUNTIME_CONFIG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Runtime config cache is an optimization only.
  }
}

function hydrateMemoryCache(config: ResolvedRuntimeConfig): ResolvedRuntimeConfig {
  cachedApiUrl = config.apiUrl;
  cachedAppBasePath = config.baseUrl;
  return config;
}

function isPersistedConfigFresh(config: PersistedRuntimeConfig | null): boolean {
  if (!config) return false;
  return Date.now() - config.fetchedAt < RUNTIME_CONFIG_TTL_MS;
}

function refreshRuntimeConfigInBackground(): void {
  if (backgroundRefreshPromise) return;

  backgroundRefreshPromise = fetchRuntimeConfig()
    .then((config) => {
      hydrateMemoryCache(config);
      persistRuntimeConfig(config);
    })
    .finally(() => {
      backgroundRefreshPromise = null;
    });
}

export function loadConfig(): Promise<string> {
  if (!configPromise) {
    const persisted = readPersistedRuntimeConfig();

    if (persisted) {
      const resolved = hydrateMemoryCache({
        apiUrl: persisted.apiUrl,
        baseUrl: persisted.baseUrl,
      });

      if (!isPersistedConfigFresh(persisted)) {
        refreshRuntimeConfigInBackground();
      }

      configPromise = Promise.resolve(resolved);
    } else {
      configPromise = fetchRuntimeConfig().then((config) => {
        hydrateMemoryCache(config);
        persistRuntimeConfig(config);
        return config;
      });
    }
  }

  return configPromise.then((config) => config.apiUrl);
}

export async function getApiUrl(): Promise<string> {
  return loadConfig();
}

export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (isValidApiUrl(env)) return normalizeBaseUrl(env);
  return cachedApiUrl || normalizeBaseUrl(DEFAULT_API_BASE_URL);
}

export function getAppBasePath(): string {
  return cachedAppBasePath || normalizeAppBasePath(import.meta.env.BASE_URL || '/');
}

export function resolveAppPath(path: string): string {
  if (!path) {
    return getAppBasePath();
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const [pathnameWithQuery, hashFragment] = path.split('#', 2);
  const [pathnamePart, queryString] = pathnameWithQuery.split('?', 2);
  const normalizedPathname = pathnamePart.startsWith('/') ? pathnamePart : `/${pathnamePart}`;
  const basePath = getAppBasePath();

  const resolvedPath =
    basePath === '/'
      ? normalizedPathname
      : `${basePath}${normalizedPathname === '/' ? '' : normalizedPathname}`;

  const resolvedQuery = queryString ? `?${queryString}` : '';
  const resolvedHash = hashFragment ? `#${hashFragment}` : '';

  return `${resolvedPath}${resolvedQuery}${resolvedHash}`;
}

export function isCurrentAppPath(path: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return currentPath === resolveAppPath(path);
}
