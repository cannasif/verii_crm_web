import axios from 'axios';
import i18n from './i18n';

const API_BASE_URL = 'https://crmapi.v3rii.com';

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

let apiUrl = normalizeBaseUrl(API_BASE_URL);
let configPromise: Promise<string> | null = null;

async function fetchRuntimeConfig(): Promise<string> {
  const envUrl = import.meta.env.VITE_API_URL;
  if (isValidApiUrl(envUrl)) return normalizeBaseUrl(envUrl);

  try {
    const response = await fetch('/config.json', {
      cache: import.meta.env.PROD ? 'no-cache' : 'default',
    });
    if (!response.ok) return API_BASE_URL;
    const config = (await response.json()) as RuntimeConfig;
    if (isValidApiUrl(config?.apiUrl)) return normalizeBaseUrl(config.apiUrl!);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[axios] config.json yüklenemedi, fallback kullanılıyor:', error);
    }
  }
  return normalizeBaseUrl(API_BASE_URL);
}

export function loadConfig(): Promise<string> {
  if (!configPromise) {
    configPromise = fetchRuntimeConfig();
  }
  return configPromise;
}

export async function ensureApiReady(): Promise<void> {
  const base = await loadConfig();
  apiUrl = base;
  api.defaults.baseURL = base;
}

export async function getApiUrl(): Promise<string> {
  return loadConfig();
}

export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (isValidApiUrl(env)) return normalizeBaseUrl(env);
  return apiUrl || normalizeBaseUrl(API_BASE_URL);
}

let authStoreModule: Promise<typeof import('@/stores/auth-store')> | null = null;
function getAuthStore(): Promise<typeof import('@/stores/auth-store')> {
  if (!authStoreModule) authStoreModule = import('@/stores/auth-store');
  return authStoreModule;
}

export const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  config.baseURL = config.baseURL || apiUrl || api.defaults.baseURL;

  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Language'] = i18n.language || 'tr';

  try {
    const { useAuthStore } = await getAuthStore();
    const branch = useAuthStore.getState().branch;
    if (branch?.code) {
      config.headers['X-Branch-Code'] = branch.code;
    }
  } catch {
    void 0;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');

      try {
        const { useAuthStore } = await getAuthStore();
        useAuthStore.getState().logout();
      } catch {
        void 0;
      }

      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login?sessionExpired=true';
      }
    }

    const apiError = error.response?.data;
    if (apiError?.message) {
      error.message = apiError.message;
    } else if (apiError?.exceptionMessage) {
      error.message = apiError.exceptionMessage;
    }

    return Promise.reject(error);
  }
);

declare module 'axios' {
  export interface AxiosInstance {
    get<T = unknown>(url: string, config?: import('axios').AxiosRequestConfig): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig): Promise<T>;
    delete<T = unknown>(url: string, config?: import('axios').AxiosRequestConfig): Promise<T>;
    patch<T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig): Promise<T>;
  }
}
