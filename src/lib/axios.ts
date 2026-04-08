import axios from 'axios';
import i18n from './i18n';
import { useAuthStore } from '@/stores/auth-store';
import { getUserFromToken } from '@/utils/jwt';
import {
  loadConfig,
  getApiUrl,
  getApiBaseUrl,
  isCurrentAppPath,
  resolveAppPath,
} from './api-config';

export { loadConfig, getApiUrl, getApiBaseUrl, resolveAppPath };

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

let refreshPromise: Promise<string | null> | null = null;

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
  if (normalized.details === undefined && source.Details !== undefined) {
    normalized.details = source.Details;
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

function isIsoDateTimeWithoutOffset(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
}

function convertLocalDateTimeStringToUtc(value: string): string {
  if (!isIsoDateTimeWithoutOffset(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function normalizeUtcDateStrings(payload: unknown): unknown {
  if (
    payload == null ||
    typeof payload !== 'object' ||
    payload instanceof Date ||
    (typeof Blob !== 'undefined' && payload instanceof Blob) ||
    payload instanceof ArrayBuffer
  ) {
    if (typeof payload === 'string' && isIsoDateTimeWithoutOffset(payload)) {
      return `${payload}Z`;
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeUtcDateStrings(item));
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  Object.entries(source).forEach(([key, value]) => {
    normalized[key] = normalizeUtcDateStrings(value);
  });
  return normalized;
}

function normalizeOutgoingUtcDateStrings(payload: unknown): unknown {
  if (
    payload == null ||
    typeof payload !== 'object' ||
    payload instanceof Date ||
    (typeof Blob !== 'undefined' && payload instanceof Blob) ||
    payload instanceof ArrayBuffer
  ) {
    if (typeof payload === 'string') {
      return convertLocalDateTimeStringToUtc(payload);
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeOutgoingUtcDateStrings(item));
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  Object.entries(source).forEach(([key, value]) => {
    normalized[key] = normalizeOutgoingUtcDateStrings(value);
  });
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

function getStoredAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

function isPersistentSession(): boolean {
  return !!(localStorage.getItem('access_token') || localStorage.getItem('refresh_token'));
}

function storeTokens(accessToken: string, refreshToken: string | null): void {
  const persistent = isPersistentSession();

  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('refresh_token');

  if (persistent) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    return;
  }

  sessionStorage.setItem('access_token', accessToken);
  if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
}

function clearStoredTokens(): void {
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('refresh_token');
}

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false;

  return [
    '/api/auth/login',
    '/api/auth/refresh-token',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
  ].some((path) => url.includes(path));
}

async function refreshAccessToken(): Promise<string | null> {
  const storedRefreshToken = getStoredRefreshToken();
  if (!storedRefreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = (await axios.post(
        `${getApiBaseUrl()}/api/auth/refresh-token`,
        { refreshToken: storedRefreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Language': i18n.language || 'tr',
          },
        }
      )) as { data: unknown };

      const normalized = normalizeApiEnvelope(response.data) as {
        success?: boolean;
        data?: { token?: string; refreshToken?: string };
        message?: string;
        exceptionMessage?: string;
      };

      if (!normalized.success || !normalized.data?.token) {
        throw new Error(normalized.message || normalized.exceptionMessage || 'Session refresh failed');
      }

      storeTokens(normalized.data.token, normalized.data.refreshToken ?? storedRefreshToken);

      const decodedUser = getUserFromToken(normalized.data.token);
      const branch = useAuthStore.getState().branch;
      if (decodedUser) {
        useAuthStore.getState().setAuth(
          decodedUser,
          normalized.data.token,
          branch,
          isPersistentSession(),
          normalized.data.refreshToken ?? storedRefreshToken
        );
      } else {
        useAuthStore.setState({ token: normalized.data.token });
      }

      return normalized.data.token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  config.baseURL = config.baseURL || getApiBaseUrl() || api.defaults.baseURL;

  if (config.data !== undefined) {
    config.data = normalizeOutgoingUtcDateStrings(config.data);
  }

  const token = getStoredAccessToken();
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
    response.data = normalizeUtcDateStrings(normalizeApiEnvelope(response.data));
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config as import('axios').AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest.url)) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh fallback continues with logout below.
      }

      clearStoredTokens();
      useAuthStore.getState().logout();

      if (!isCurrentAppPath('/auth/login?sessionExpired=true') && !isCurrentAppPath('/auth/login')) {
        window.location.href = resolveAppPath('/auth/login?sessionExpired=true');
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
