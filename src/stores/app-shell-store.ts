import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAccessApi } from '@/features/access-control/api/authAccessApi';
import { notificationApi } from '@/features/notification/api/notification-api';
import { userDetailApi } from '@/features/user-detail-management/api/user-detail-api';
import type { UserDetailDto } from '@/features/user-detail-management/types/user-detail-types';
import { applySystemLanguageIfNeeded } from '@/lib/system-settings';
import { isFresh } from '@/lib/cache-ttl';
import {
  PERMISSIONS_CACHE_TTL_MS,
  getPermissionCacheEntry,
  usePermissionsStore,
} from '@/stores/permissions-store';
import {
  SYSTEM_SETTINGS_CACHE_TTL_MS,
  getSystemSettingsCacheEntry,
  useSystemSettingsStore,
} from '@/stores/system-settings-store';
import { ensurePermissionDefinitionsSynced } from '@/features/access-control/utils/permission-definition-sync';

export const APP_SHELL_USER_SUMMARY_TTL_MS = 30 * 60 * 1000;
export const APP_SHELL_UNREAD_COUNT_TTL_MS = 60 * 1000;

interface CacheEntry<T> {
  data: T;
  lastFetchedAt: number;
}

interface AppShellStoreState {
  bootstrapStatus: 'idle' | 'loading' | 'ready' | 'error';
  bootstrapError: unknown | null;
  userSummaries: Record<string, CacheEntry<UserDetailDto | null>>;
  unreadCounts: Record<string, CacheEntry<number>>;
  setBootstrapStatus: (status: AppShellStoreState['bootstrapStatus'], error?: unknown | null) => void;
  setUserSummary: (userId: number, summary: UserDetailDto | null, fetchedAt?: number) => void;
  setUnreadCount: (userId: number, count: number, fetchedAt?: number) => void;
  decrementUnreadCount: (userId: number, amount?: number) => void;
  clearAppShellData: (userId?: number | null) => void;
  bootstrapAppShell: (args: { token: string | null; userId: number | null; force?: boolean }) => Promise<void>;
  refreshUserSummary: (userId: number, force?: boolean) => Promise<UserDetailDto | null>;
  refreshUnreadCount: (userId: number, force?: boolean) => Promise<number>;
}

let bootstrapPromise: Promise<void> | null = null;
const userSummaryPromises = new Map<number, Promise<UserDetailDto | null>>();
const unreadCountPromises = new Map<number, Promise<number>>();
const runAsyncTask = (task: () => Promise<unknown>): void => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(() => {
      void task();
    });
    return;
  }

  globalThis.setTimeout(() => {
    void task();
  }, 0);
};

function getUserSummaryEntry(userId: number | null | undefined): CacheEntry<UserDetailDto | null> | null {
  if (!userId) return null;
  return useAppShellStore.getState().userSummaries[String(userId)] ?? null;
}

function getUnreadCountEntry(userId: number | null | undefined): CacheEntry<number> | null {
  if (!userId) return null;
  return useAppShellStore.getState().unreadCounts[String(userId)] ?? null;
}

export const useAppShellStore = create<AppShellStoreState>()(
  persist(
    (set, get) => ({
      bootstrapStatus: 'idle',
      bootstrapError: null,
      userSummaries: {},
      unreadCounts: {},

      setBootstrapStatus: (status, error = null) =>
        set({
          bootstrapStatus: status,
          bootstrapError: error,
        }),

      setUserSummary: (userId, summary, fetchedAt = Date.now()) =>
        set((state) => ({
          userSummaries: {
            ...state.userSummaries,
            [String(userId)]: {
              data: summary,
              lastFetchedAt: fetchedAt,
            },
          },
        })),

      setUnreadCount: (userId, count, fetchedAt = Date.now()) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [String(userId)]: {
              data: count,
              lastFetchedAt: fetchedAt,
            },
          },
        })),

      decrementUnreadCount: (userId, amount = 1) =>
        set((state) => {
          const current = state.unreadCounts[String(userId)];
          const nextValue = Math.max(0, (current?.data ?? 0) - amount);
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [String(userId)]: {
                data: nextValue,
                lastFetchedAt: Date.now(),
              },
            },
          };
        }),

      clearAppShellData: (userId) =>
        set((state) => {
          if (userId == null) {
            return {
              bootstrapStatus: 'idle',
              bootstrapError: null,
              userSummaries: {},
              unreadCounts: {},
            };
          }

          const nextSummaries = { ...state.userSummaries };
          const nextUnreadCounts = { ...state.unreadCounts };
          delete nextSummaries[String(userId)];
          delete nextUnreadCounts[String(userId)];

          return {
            userSummaries: nextSummaries,
            unreadCounts: nextUnreadCounts,
          };
        }),

      refreshUserSummary: async (userId, force = false) => {
        const cacheEntry = getUserSummaryEntry(userId);
        if (!force && isFresh(cacheEntry?.lastFetchedAt, APP_SHELL_USER_SUMMARY_TTL_MS)) {
          return cacheEntry?.data ?? null;
        }

        const existingPromise = userSummaryPromises.get(userId);
        if (existingPromise) {
          return existingPromise;
        }

        const promise = (async () => {
          const summary = await userDetailApi.getByUserId(userId);
          get().setUserSummary(userId, summary);
          return summary;
        })().finally(() => {
          userSummaryPromises.delete(userId);
        });

        userSummaryPromises.set(userId, promise);
        return promise;
      },

      refreshUnreadCount: async (userId, force = false) => {
        const cacheEntry = getUnreadCountEntry(userId);
        if (!force && isFresh(cacheEntry?.lastFetchedAt, APP_SHELL_UNREAD_COUNT_TTL_MS)) {
          return cacheEntry?.data ?? 0;
        }

        const existingPromise = unreadCountPromises.get(userId);
        if (existingPromise) {
          return existingPromise;
        }

        const promise = (async () => {
          const count = await notificationApi.getUnreadCount();
          get().setUnreadCount(userId, count);
          return count;
        })().finally(() => {
          unreadCountPromises.delete(userId);
        });

        unreadCountPromises.set(userId, promise);
        return promise;
      },

      bootstrapAppShell: async ({ token, userId, force = false }) => {
        if (!token || !userId) {
          get().setBootstrapStatus('idle', null);
          return;
        }

        if (bootstrapPromise && !force) {
          return bootstrapPromise;
        }

        const runBootstrap = async (): Promise<void> => {
          const settingsEntry = getSystemSettingsCacheEntry();
          const permissionEntry = getPermissionCacheEntry(userId);
          const hasFreshSettings =
            settingsEntry.hasLoadedFromApi && isFresh(settingsEntry.lastFetchedAt, SYSTEM_SETTINGS_CACHE_TTL_MS);
          const hasFreshPermissions = isFresh(permissionEntry?.lastFetchedAt, PERMISSIONS_CACHE_TTL_MS);
          const shouldFetchBootstrap = force || !hasFreshSettings || !hasFreshPermissions;

          const summaryEntry = getUserSummaryEntry(userId);
          const unreadEntry = getUnreadCountEntry(userId);
          const shouldFetchUserSummary = force || !isFresh(summaryEntry?.lastFetchedAt, APP_SHELL_USER_SUMMARY_TTL_MS);
          const shouldFetchUnreadCount = force || !isFresh(unreadEntry?.lastFetchedAt, APP_SHELL_UNREAD_COUNT_TTL_MS);

          if (!shouldFetchBootstrap && !shouldFetchUserSummary && !shouldFetchUnreadCount) {
            if (settingsEntry.hasLoadedFromApi) {
              await applySystemLanguageIfNeeded();
            }
            get().setBootstrapStatus('ready', null);
            return;
          }

          get().setBootstrapStatus('loading', null);

          try {
            if (shouldFetchBootstrap) {
              const bootstrap = await authAccessApi.getBootstrap();
              useSystemSettingsStore.getState().setSettings(bootstrap.systemSettings);
              usePermissionsStore.getState().setPermissions(bootstrap.permissions.userId, bootstrap.permissions);
              await applySystemLanguageIfNeeded();

              runAsyncTask(async () => {
                try {
                  await ensurePermissionDefinitionsSynced({
                    userId: bootstrap.permissions.userId,
                    permissions: bootstrap.permissions,
                  });
                } catch {
                  // Permission definition sync is best-effort and should never block login/bootstrap.
                }
              });
            } else if (settingsEntry.hasLoadedFromApi) {
              await applySystemLanguageIfNeeded();
            }

            get().setBootstrapStatus('ready', null);

            if (shouldFetchUserSummary) {
              runAsyncTask(async () => {
                await get().refreshUserSummary(userId, true);
              });
            }
            if (shouldFetchUnreadCount) {
              runAsyncTask(async () => {
                await get().refreshUnreadCount(userId, true);
              });
            }
          } catch (error) {
            get().setBootstrapStatus('error', error);
            throw error;
          }
        };

        bootstrapPromise = runBootstrap().finally(() => {
          bootstrapPromise = null;
        });

        return bootstrapPromise;
      },
    }),
    {
      name: 'app-shell-storage',
      partialize: (state) => ({
        userSummaries: state.userSummaries,
        unreadCounts: state.unreadCounts,
      }),
    }
  )
);

export function getUserSummaryCacheEntry(userId: number | null | undefined): CacheEntry<UserDetailDto | null> | null {
  return getUserSummaryEntry(userId);
}

export function getUnreadCountCacheEntry(userId: number | null | undefined): CacheEntry<number> | null {
  return getUnreadCountEntry(userId);
}
