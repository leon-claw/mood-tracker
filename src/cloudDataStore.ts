import { AppExportData } from './dataPortability';
import { LogEntry } from './types';

export interface AuthUser {
  id: string;
  email: string;
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
}

export interface CloudDataStoreOptions {
  apiBaseUrl?: string;
}

const parseJson = async <Result>(response: Response): Promise<Result> => {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error?.message === 'string' ? body.error.message : '请求失败，请稍后再试。';
    throw new Error(message);
  }

  return body as Result;
};

const normalizeApiBaseUrl = (apiBaseUrl?: string) => (apiBaseUrl || '').trim().replace(/\/+$/, '');
const resolveApiUrl = (apiBaseUrl: string, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!apiBaseUrl) return normalizedPath;
  if (apiBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${apiBaseUrl}${normalizedPath.slice('/api'.length)}`;
  }
  return `${apiBaseUrl}${normalizedPath}`;
};

export const createCloudDataStore = (
  fetcher: typeof fetch = fetch,
  options: CloudDataStoreOptions = {}
): CloudDataStore => {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);

  const request = async <Result>(path: string, init: RequestInit = {}) => {
    const response = await fetcher(resolveApiUrl(apiBaseUrl, path), {
      ...init,
      credentials: 'include',
    });
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

  return {
    getCaptcha: () => request<CaptchaChallenge>('/api/captcha'),
    async register(payload) {
      const response = await jsonRequest<{ user: AuthUser }>('/api/auth/register', 'POST', payload);
      return response.user;
    },
    async login(email, password) {
      const response = await jsonRequest<{ user: AuthUser }>('/api/auth/login', 'POST', { email, password });
      return response.user;
    },
    async logout() {
      await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    },
    async getMe() {
      try {
        const response = await request<{ user: AuthUser }>('/api/me');
        return response.user;
      } catch {
        return null;
      }
    },
    async changePassword(currentPassword, newPassword) {
      await jsonRequest<{ ok: boolean }>('/api/me/password', 'PATCH', { currentPassword, newPassword });
    },
    getData: () => request<AppExportData>('/api/sync'),
    replaceData: (data) => jsonRequest<AppExportData>('/api/sync', 'PUT', data),
    async upsertEntry(entry) {
      const response = await jsonRequest<{ entry: LogEntry }>('/api/entries', 'POST', {
        date: entry.date,
        values: entry.values,
      });
      return response.entry;
    },
    async deleteEntry(entryId) {
      await request<{ ok: boolean }>(`/api/entries/${entryId}`, { method: 'DELETE' });
    },
    async updateUserState(state) {
      await jsonRequest('/api/user-state', 'PUT', state);
    },
  };
};
