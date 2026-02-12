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

api.interceptors.request.use((config) => {
  config.baseURL = config.baseURL || getApiBaseUrl() || api.defaults.baseURL;

  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Language'] = i18n.language || 'tr';

  const branch = useAuthStore.getState().branch;
  if (branch?.code) {
    config.headers['X-Branch-Code'] = branch.code;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      useAuthStore.getState().logout();

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
