import { AppExportData, normalizeAppData, normalizeEntries } from './dataPortability';
import { LogEntry, LogValues } from './types';
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

export interface CloudBootstrapData {
  points: number;
  unlockedItems: string[];
  isPremiumUnlocked: boolean;
  preferences: AppPreferences;
}

export interface EntryMonthSummary {
  year: number;
  month: number;
  count: number;
}

export interface YearlyMonthSummary {
  month: number;
  entryCount: number;
  averageMood: number | null;
  averageSleepQuality: number | null;
}

export interface YearlyReportData {
  year: number;
  months: YearlyMonthSummary[];
}

export type CloudEntryChange =
  | { operation: 'upsert'; date: string; values: LogValues }
  | { operation: 'delete'; date: string };

export interface CloudChangesPayload {
  entries?: CloudEntryChange[];
  userState?: Pick<AppExportData, 'points' | 'unlockedItems' | 'isPremiumUnlocked'>;
  preferences?: AppPreferences;
}

export interface CloudChangesResult {
  entries: LogEntry[];
  deletedDates: string[];
  bootstrap?: CloudBootstrapData;
}

export interface CloudDataStore {
  getCaptcha(): Promise<CaptchaChallenge>;
  register(payload: { email: string; password: string; captchaId: string; captchaText: string }): Promise<AuthUser>;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  getMe(): Promise<AuthUser | null>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getBootstrap(): Promise<CloudBootstrapData>;
  getEntriesByMonth(year: number, month: number): Promise<LogEntry[]>;
  getEntryMonths(): Promise<EntryMonthSummary[]>;
  getYearlyReport(year: number): Promise<YearlyReportData>;
  applyChanges(changes: CloudChangesPayload): Promise<CloudChangesResult>;
  getExportData(): Promise<AppExportData>;
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

const normalizeBootstrap = (value: unknown): CloudBootstrapData => {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const points = Number(candidate.points);
  return {
    points: Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0,
    unlockedItems: Array.isArray(candidate.unlockedItems)
      ? candidate.unlockedItems.filter((item): item is string => typeof item === 'string')
      : [],
    isPremiumUnlocked: candidate.isPremiumUnlocked === true,
    preferences: normalizeAppPreferences(candidate.preferences),
  };
};

const normalizeMonth = (value: number) => Math.min(12, Math.max(1, Math.round(value)));
const formatMonthQuery = (year: number, month: number) =>
  `${Math.round(year)}-${String(normalizeMonth(month)).padStart(2, '0')}`;

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
    getBootstrap: () => syncRequest(async () =>
      normalizeBootstrap(await request<unknown>('/api/bootstrap'))
    ),
    getEntriesByMonth: (year, month) => syncRequest(async () => {
      const response = await request<{ entries: unknown }>(
        `/api/entries?month=${encodeURIComponent(formatMonthQuery(year, month))}`
      );
      return normalizeEntries(response.entries);
    }),
    getEntryMonths: () => syncRequest(async () => {
      const response = await request<{ months?: unknown }>('/api/entry-months');
      if (!Array.isArray(response.months)) return [];
      return response.months.reduce<EntryMonthSummary[]>((result, item) => {
        if (!item || typeof item !== 'object') return result;
        const candidate = item as Record<string, unknown>;
        const year = Number(candidate.year);
        const month = Number(candidate.month);
        const count = Number(candidate.count);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return result;
        result.push({ year, month, count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0 });
        return result;
      }, []);
    }),
    getYearlyReport: (year) => syncRequest(async () =>
      request<YearlyReportData>(`/api/reports/yearly?year=${encodeURIComponent(String(Math.round(year)))}`)
    ),
    applyChanges: (changes) => syncRequest(async () => {
      const response = await jsonRequest<CloudChangesResult>('/api/changes', 'POST', changes);
      return {
        entries: normalizeEntries(response.entries),
        deletedDates: Array.isArray(response.deletedDates)
          ? response.deletedDates.filter((date): date is string => typeof date === 'string')
          : [],
        ...(response.bootstrap ? { bootstrap: normalizeBootstrap(response.bootstrap) } : {}),
      };
    }),
    getExportData: () => syncRequest(async () => {
      const response = await request<{ data?: unknown }>('/api/export');
      return normalizeAppData(response.data);
    }),
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
