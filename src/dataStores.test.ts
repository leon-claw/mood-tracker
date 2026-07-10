import assert from 'node:assert/strict';
import {
  clearLocalAppData,
  hasLocalBusinessData,
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
import { createCloudDataStore } from './cloudDataStore';
import { AppExportData } from './dataPortability';

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

const data: AppExportData = {
  entries: [
    {
      id: 'entry-1',
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
};

clearLocalAppData();
assert.equal(hasLocalBusinessData(), false);
assert.deepEqual(readLocalAppData(), {
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
});

writeLocalAppData(data);
assert.equal(hasLocalBusinessData(), true);
assert.deepEqual(readLocalAppData(), data);

clearLocalAppData();
assert.equal(hasLocalBusinessData(), false);
assert.equal(localStorage.getItem('mood_tracker_entries_v4'), null);

const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
const fetcher: typeof fetch = async (input, init) => {
  calls.push({ input, init });
  if (String(input).endsWith('/api/captcha')) {
    return new Response(JSON.stringify({ captchaId: 'captcha-1', svg: '<svg></svg>', expiresAt: '2026-07-08T00:00:00.000Z' }));
  }
  if (String(input).endsWith('/api/auth/login')) {
    return new Response(JSON.stringify({ user: { id: 'user-1', email: 'a@example.com' } }));
  }
  if (String(input).endsWith('/api/sync')) {
    return new Response(JSON.stringify(data));
  }
  if (String(input).endsWith('/api/entries')) {
    return new Response(JSON.stringify({ entry: data.entries[0] }));
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
await cloud.logout();

assert.deepEqual(
  calls.map((call) => [String(call.input), call.init?.method || 'GET', call.init?.credentials]),
  [
    ['/api/captcha', 'GET', 'include'],
    ['/api/auth/login', 'POST', 'include'],
    ['/api/sync', 'PUT', 'include'],
    ['/api/entries', 'POST', 'include'],
    ['/api/auth/logout', 'POST', 'include'],
  ]
);

assert.equal(calls[1].init?.headers && (calls[1].init.headers as Record<string, string>)['Content-Type'], 'application/json');
assert.equal(JSON.parse(String(calls[1].init?.body)).email, 'A@EXAMPLE.COM');
assert.equal(JSON.parse(String(calls[2].init?.body)).entries[0].id, 'entry-1');

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

console.log('data store tests passed');
