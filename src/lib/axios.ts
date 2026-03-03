import axios from 'axios';
import i18n from './i18n';
import { useAuthStore } from '@/stores/auth-store';
import {
  loadConfig,
  getApiUrl,
  getApiBaseUrl,
} from './api-config';

export { loadConfig, getApiUrl, getApiBaseUrl };

export async function ensureApiReady(): Promise<void> {
  const base = await loadConfig();
  api.defaults.baseURL = base;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

function resolveBranchCodeFromPersistedState(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { branch?: { code?: string | number; id?: string | number } };
    };

    const code = parsed?.state?.branch?.code ?? parsed?.state?.branch?.id;
    if (code == null) return null;

    const normalized = String(code).trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeApiEnvelope(payload: unknown): unknown {
  if (
    (typeof Blob !== 'undefined' && payload instanceof Blob) ||
    payload instanceof ArrayBuffer
  ) {
    return payload;
  }

  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...source };

  if (normalized.success === undefined && typeof source.Success === 'boolean') {
    normalized.success = source.Success;
  }
  if (normalized.message === undefined && typeof source.Message === 'string') {
    normalized.message = source.Message;
  }
  if (normalized.exceptionMessage === undefined && typeof source.ExceptionMessage === 'string') {
    normalized.exceptionMessage = source.ExceptionMessage;
  }
  if (normalized.data === undefined && source.Data !== undefined) {
    normalized.data = source.Data;
  }
  if (normalized.errors === undefined && Array.isArray(source.Errors)) {
    normalized.errors = source.Errors;
  }
  if (normalized.timestamp === undefined && typeof source.Timestamp === 'string') {
    normalized.timestamp = source.Timestamp;
  }
  if (normalized.statusCode === undefined && typeof source.StatusCode === 'number') {
    normalized.statusCode = source.StatusCode;
  }
  if (normalized.className === undefined && typeof source.ClassName === 'string') {
    normalized.className = source.ClassName;
  }

  return normalized;
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (payload == null || typeof payload !== 'object') return null;

  const errorPayload = payload as Record<string, unknown>;

  const message = errorPayload.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  const exceptionMessage = errorPayload.exceptionMessage;
  if (typeof exceptionMessage === 'string' && exceptionMessage.trim().length > 0) {
    return exceptionMessage;
  }

  const errors = errorPayload.errors;
  if (Array.isArray(errors)) {
    const firstError = errors.find((item) => typeof item === 'string' && item.trim().length > 0);
    if (typeof firstError === 'string') {
      return firstError;
    }
  }

  return null;
}

api.interceptors.request.use((config) => {
  config.baseURL = config.baseURL || getApiBaseUrl() || api.defaults.baseURL;

  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Language'] = i18n.language || 'tr';

  const branch = useAuthStore.getState().branch;
  const branchCode = branch?.code || resolveBranchCodeFromPersistedState();
  if (branchCode) {
    config.headers['X-Branch-Code'] = branchCode;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    response.data = normalizeApiEnvelope(response.data);
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      useAuthStore.getState().logout();

      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login?sessionExpired=true';
      }
    }

    const apiError = normalizeApiEnvelope(error.response?.data);
    if (error.response) {
      error.response.data = apiError;
    }

    const apiMessage = extractApiErrorMessage(apiError);
    if (apiMessage) {
      error.message = apiMessage;
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
