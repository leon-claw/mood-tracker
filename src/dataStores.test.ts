import assert from 'node:assert/strict';
import {
  clearLocalAppData,
  hasLocalBusinessData,
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
import {
  CLOUD_AUTH_TOKEN_STORAGE_KEY,
  createCloudDataStore,
  hasStoredCloudAuthToken,
} from './cloudDataStore';
import { AppExportData } from './dataPortability';
import { createDefaultAppPreferences } from '../shared/appPreferences';

const entryId = '5fd3db76-8db6-4bf7-981e-7268f4426107';

class FakeStorage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new FakeStorage() as unknown as Storage;
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
});

assert.equal(hasStoredCloudAuthToken(storage), false);
storage.setItem(CLOUD_AUTH_TOKEN_STORAGE_KEY, 'stored-token');
assert.equal(hasStoredCloudAuthToken(storage), true);
storage.removeItem(CLOUD_AUTH_TOKEN_STORAGE_KEY);

const data: AppExportData = {
  entries: [
    {
      id: entryId,
      date: '2026-07-08',
      values: {
        sleepQuality: 8,
        moodLevel: 9,
        energyLevel: 7,
        dietHealth: 6,
        workEfficiency: 8,
        activities: ['running'],
        weather: ['sunny'],
        social: ['party'],
        achievementMilestones: ['newStage'],
        journal: '本地记录',
        achievement: '写完 store 测试',
      },
    },
  ],
  points: 80,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
  preferences: {
    enabledRecordFieldIds: ['sleepQuality', 'moodLevel', 'journal'],
    reminders: { enabled: true, times: ['08:30', '21:00'] },
  },
};

clearLocalAppData();
assert.equal(hasLocalBusinessData(), false);
assert.deepEqual(readLocalAppData(), {
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: createDefaultAppPreferences(),
});

writeLocalAppData(data);
assert.equal(hasLocalBusinessData(), true);
assert.deepEqual(readLocalAppData(), data);

clearLocalAppData();
assert.equal(hasLocalBusinessData(), false);
assert.equal(localStorage.getItem('mood_tracker_entries_v4'), null);
assert.equal(localStorage.getItem('mood_tracker_preferences'), null);

const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
const fetcher: typeof fetch = async (input, init) => {
  calls.push({ input, init });
  if (String(input).endsWith('/api/captcha')) {
    return new Response(JSON.stringify({ captchaId: 'captcha-1', svg: '<svg></svg>', expiresAt: '2026-07-08T00:00:00.000Z' }));
  }
  if (String(input).endsWith('/api/auth/login')) {
    return new Response(JSON.stringify({ user: { id: 'user-1', email: 'a@example.com' }, token: 'token-1' }));
  }
  if (String(input).endsWith('/api/sync')) {
    return new Response(JSON.stringify(data));
  }
  if (String(input).endsWith('/api/entries')) {
    return new Response(JSON.stringify({ entry: data.entries[0] }));
  }
  if (String(input).endsWith('/api/preferences')) {
    return new Response(JSON.stringify({ preferences: data.preferences }));
  }
  return new Response(JSON.stringify({ ok: true }));
};

const cloud = createCloudDataStore(fetcher);
assert.deepEqual(await cloud.getCaptcha(), {
  captchaId: 'captcha-1',
  svg: '<svg></svg>',
  expiresAt: '2026-07-08T00:00:00.000Z',
});
assert.deepEqual(await cloud.login('A@EXAMPLE.COM', 'password123'), {
  id: 'user-1',
  email: 'a@example.com',
});
assert.deepEqual(await cloud.replaceData(data), data);
assert.deepEqual(await cloud.upsertEntry(data.entries[0]), data.entries[0]);
assert.deepEqual(await cloud.updatePreferences(data.preferences), data.preferences);
await cloud.logout();

assert.deepEqual(
  calls.map((call) => [String(call.input), call.init?.method || 'GET', call.init?.credentials]),
  [
    ['/api/captcha', 'GET', 'include'],
    ['/api/auth/login', 'POST', 'include'],
    ['/api/sync', 'PUT', 'include'],
    ['/api/entries', 'POST', 'include'],
    ['/api/preferences', 'PUT', 'include'],
    ['/api/auth/logout', 'POST', 'include'],
  ]
);

assert.equal(calls[1].init?.headers && (calls[1].init.headers as Record<string, string>)['Content-Type'], 'application/json');
assert.equal(JSON.parse(String(calls[1].init?.body)).email, 'A@EXAMPLE.COM');
assert.equal(JSON.parse(String(calls[2].init?.body)).entries[0].id, entryId);
assert.deepEqual(JSON.parse(String(calls[4].init?.body)), data.preferences);

calls.length = 0;
const bearerCloud = createCloudDataStore(fetcher, {
  useBearerToken: true,
  tokenStorageKey: 'mood_tracker_test_token',
});
assert.deepEqual(await bearerCloud.login('A@EXAMPLE.COM', 'password123'), {
  id: 'user-1',
  email: 'a@example.com',
});
assert.deepEqual(await bearerCloud.getData(), data);
await bearerCloud.logout();

assert.deepEqual(
  calls.map((call) => [String(call.input), call.init?.method || 'GET', call.init?.credentials]),
  [
    ['/api/auth/login', 'POST', 'omit'],
    ['/api/sync', 'GET', 'omit'],
    ['/api/auth/logout', 'POST', 'omit'],
  ]
);
assert.equal((calls[0].init?.headers as Record<string, string>)['X-Mood-Tracker-Auth'], 'bearer');
assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, undefined);
assert.equal((calls[1].init?.headers as Record<string, string>)['X-Mood-Tracker-Auth'], 'bearer');
assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, 'Bearer token-1');
assert.equal(localStorage.getItem('mood_tracker_test_token'), null);

const legacyCloud = createCloudDataStore(async () => new Response(JSON.stringify({
  entries: [],
  points: 20,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: { enabledRecordFieldIds: ['moodLevel', 'journal'] },
})));
assert.deepEqual(await legacyCloud.getData(), {
  entries: [],
  points: 20,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: {
    enabledRecordFieldIds: ['moodLevel', 'journal'],
    reminders: createDefaultAppPreferences().reminders,
  },
});

localStorage.setItem('mood_tracker_invalid_token', 'expired-token');
const invalidSessionCloud = createCloudDataStore(
  async () => new Response(
    JSON.stringify({ error: { message: '登录状态已失效。' } }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  ),
  { useBearerToken: true, tokenStorageKey: 'mood_tracker_invalid_token' }
);
assert.equal(await invalidSessionCloud.getMe(), null);
assert.equal(localStorage.getItem('mood_tracker_invalid_token'), null);

localStorage.setItem('mood_tracker_offline_token', 'offline-token');
const offlineSessionCloud = createCloudDataStore(
  async () => {
    throw new TypeError('network unavailable');
  },
  { useBearerToken: true, tokenStorageKey: 'mood_tracker_offline_token' }
);
await assert.rejects(() => offlineSessionCloud.getMe(), /无法连接服务器/);
assert.equal(localStorage.getItem('mood_tracker_offline_token'), 'offline-token');
localStorage.removeItem('mood_tracker_offline_token');

calls.length = 0;
const configuredCloud = createCloudDataStore(fetcher, { apiBaseUrl: 'https://api.example.com///' });
await configuredCloud.getCaptcha();
await configuredCloud.login('A@EXAMPLE.COM', 'password123');
assert.deepEqual(
  calls.map((call) => String(call.input)),
  [
    'https://api.example.com/api/captcha',
    'https://api.example.com/api/auth/login',
  ]
);

calls.length = 0;
const configuredApiRootCloud = createCloudDataStore(fetcher, { apiBaseUrl: 'https://mood-tracker.jianghong.site/api/' });
await configuredApiRootCloud.getCaptcha();
await configuredApiRootCloud.login('A@EXAMPLE.COM', 'password123');
assert.deepEqual(
  calls.map((call) => String(call.input)),
  [
    'https://mood-tracker.jianghong.site/api/captcha',
    'https://mood-tracker.jianghong.site/api/auth/login',
  ]
);

const syncEvents: string[] = [];
const trackedCloud = createCloudDataStore(fetcher, {
  onSyncStart: () => syncEvents.push('start'),
  onSyncEnd: () => syncEvents.push('end'),
  onSyncError: (error) => syncEvents.push(`error:${error.message}`),
});
await trackedCloud.getData();
await trackedCloud.upsertEntry(data.entries[0]);
assert.deepEqual(syncEvents, ['start', 'end', 'start', 'end']);

const failedSyncEvents: string[] = [];
const failedCloud = createCloudDataStore(
  async () => new Response(
    JSON.stringify({ error: { message: '云端暂时不可用。' } }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  ),
  {
    onSyncStart: () => failedSyncEvents.push('start'),
    onSyncEnd: () => failedSyncEvents.push('end'),
    onSyncError: (error) => failedSyncEvents.push(`error:${error.message}`),
  }
);
await assert.rejects(() => failedCloud.getData(), /云端暂时不可用/);
assert.deepEqual(failedSyncEvents, ['start', 'error:云端暂时不可用。', 'end']);

console.log('data store tests passed');
