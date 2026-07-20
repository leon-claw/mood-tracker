import { AppExportData, normalizeAppData } from './dataPortability';
import { LogEntry } from './types';
import { AppPreferences, normalizeAppPreferences } from '../shared/appPreferences';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export interface CaptchaChallenge {
  captchaId: string;
  svg: string;
  expiresAt: string;
}

export interface CloudDataStore {
  getCaptcha(): Promise<CaptchaChallenge>;
  register(payload: { email: string; password: string; captchaId: string; captchaText: string }): Promise<AuthUser>;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  getMe(): Promise<AuthUser | null>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getData(): Promise<AppExportData>;
  replaceData(data: AppExportData): Promise<AppExportData>;
  upsertEntry(entry: Omit<LogEntry, 'id'> | LogEntry): Promise<LogEntry>;
  deleteEntry(entryId: string): Promise<void>;
  updateUserState(state: Pick<AppExportData, 'points' | 'unlockedItems' | 'isPremiumUnlocked'>): Promise<void>;
  updatePreferences(preferences: AppPreferences): Promise<AppPreferences>;
}

export interface CloudDataStoreOptions {
  apiBaseUrl?: string;
  useBearerToken?: boolean;
  tokenStorageKey?: string;
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  onSyncError?: (error: Error) => void;
}

class CloudRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CloudRequestError';
  }
}

const parseJson = async <Result>(response: Response): Promise<Result> => {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error?.message === 'string' ? body.error.message : '请求失败，请稍后再试。';
    throw new CloudRequestError(message, response.status);
  }

  return body as Result;
};

const normalizeApiBaseUrl = (apiBaseUrl?: string) => (apiBaseUrl || '').trim().replace(/\/+$/, '');
const AUTH_MODE_HEADER = 'X-Mood-Tracker-Auth';
export const CLOUD_AUTH_TOKEN_STORAGE_KEY = 'mood_tracker_cloud_token';

export const hasStoredCloudAuthToken = (
  storage?: Pick<Storage, 'getItem'>,
  tokenStorageKey = CLOUD_AUTH_TOKEN_STORAGE_KEY
) => {
  const targetStorage = storage || (typeof localStorage === 'undefined' ? null : localStorage);
  if (!targetStorage) return false;

  try {
    return Boolean(targetStorage.getItem(tokenStorageKey));
  } catch {
    return false;
  }
};

const resolveApiUrl = (apiBaseUrl: string, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!apiBaseUrl) return normalizedPath;
  if (apiBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${apiBaseUrl}${normalizedPath.slice('/api'.length)}`;
  }
  return `${apiBaseUrl}${normalizedPath}`;
};

const normalizeHeaders = (headers?: HeadersInit) => {
  const normalized: Record<string, string> = {};
  if (!headers) return normalized;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      normalized[key] = value;
    }
    return normalized;
  }

  return { ...headers };
};

export const createCloudDataStore = (
  fetcher: typeof fetch = fetch,
  options: CloudDataStoreOptions = {}
): CloudDataStore => {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  const useBearerToken = options.useBearerToken === true;
  const tokenStorageKey = options.tokenStorageKey || CLOUD_AUTH_TOKEN_STORAGE_KEY;
  let memoryToken: string | null = null;

  const readAuthToken = () => {
    if (!useBearerToken) return null;
    try {
      return localStorage.getItem(tokenStorageKey) || memoryToken;
    } catch {
      return memoryToken;
    }
  };

  const saveAuthToken = (token: string) => {
    memoryToken = token;
    try {
      localStorage.setItem(tokenStorageKey, token);
    } catch {
      // Keep the in-memory token for environments without writable localStorage.
    }
  };

  const clearAuthToken = () => {
    memoryToken = null;
    try {
      localStorage.removeItem(tokenStorageKey);
    } catch {
      // Nothing to clear when localStorage is unavailable.
    }
  };

  const request = async <Result>(path: string, init: RequestInit = {}) => {
    const headers = normalizeHeaders(init.headers);
    const token = readAuthToken();

    if (useBearerToken) {
      headers[AUTH_MODE_HEADER] = 'bearer';
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await fetcher(resolveApiUrl(apiBaseUrl, path), {
        ...init,
        headers,
        credentials: useBearerToken ? 'omit' : 'include',
      });
    } catch {
      throw new Error('无法连接服务器，请检查网络后重试。');
    }
    return parseJson<Result>(response);
  };

  const jsonRequest = <Result>(path: string, method: string, body?: unknown) =>
    request<Result>(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const syncRequest = async <Result>(operation: () => Promise<Result>) => {
    options.onSyncStart?.();
    try {
      return await operation();
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('云端同步失败，请稍后再试。');
      options.onSyncError?.(normalizedError);
      throw normalizedError;
    } finally {
      options.onSyncEnd?.();
    }
  };

  return {
    getCaptcha: () => request<CaptchaChallenge>('/api/captcha'),
    async register(payload) {
      const response = await jsonRequest<AuthResponse>('/api/auth/register', 'POST', payload);
      if (useBearerToken) {
        if (!response.token) throw new Error('登录响应缺少访问令牌。');
        saveAuthToken(response.token);
      }
      return response.user;
    },
    async login(email, password) {
      const response = await jsonRequest<AuthResponse>('/api/auth/login', 'POST', { email, password });
      if (useBearerToken) {
        if (!response.token) throw new Error('登录响应缺少访问令牌。');
        saveAuthToken(response.token);
      }
      return response.user;
    },
    async logout() {
      try {
        await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
      } finally {
        clearAuthToken();
      }
    },
    async getMe() {
      try {
        const response = await request<{ user: AuthUser }>('/api/me');
        return response.user;
      } catch (error) {
        if (error instanceof CloudRequestError && (error.status === 401 || error.status === 403)) {
          clearAuthToken();
          return null;
        }
        throw error;
      }
    },
    async changePassword(currentPassword, newPassword) {
      await jsonRequest<{ ok: boolean }>('/api/me/password', 'PATCH', { currentPassword, newPassword });
    },
    getData: () => syncRequest(async () =>
      normalizeAppData(await request<unknown>('/api/sync'))
    ),
    replaceData: (data) => syncRequest(async () =>
      normalizeAppData(await jsonRequest<unknown>('/api/sync', 'PUT', data))
    ),
    async upsertEntry(entry) {
      return syncRequest(async () => {
        const response = await jsonRequest<{ entry: LogEntry }>('/api/entries', 'POST', {
          date: entry.date,
          values: entry.values,
        });
        return response.entry;
      });
    },
    async deleteEntry(entryId) {
      await syncRequest(() => request<{ ok: boolean }>(`/api/entries/${entryId}`, { method: 'DELETE' }));
    },
    async updateUserState(state) {
      await syncRequest(() => jsonRequest('/api/user-state', 'PUT', state));
    },
    async updatePreferences(preferences) {
      const response = await syncRequest(() => jsonRequest<{ preferences: AppPreferences }>(
        '/api/preferences',
        'PUT',
        preferences
      ));
      return normalizeAppPreferences(response.preferences);
    },
  };
};
