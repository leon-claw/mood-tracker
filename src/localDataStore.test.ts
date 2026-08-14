import assert from 'node:assert/strict';
import {
  clearLocalAppData,
  hasLocalBusinessData,
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
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
      autoData: {
        weather: {
          weatherCode: 0,
          temperatureC: 28,
          provider: 'open-meteo',
          collectedAt: '2026-07-08T10:00:00Z',
        },
      },
    },
  ],
  points: 80,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
  preferences: {
    enabledRecordFieldIds: ['sleepQuality', 'moodLevel', 'journal'],
    reminders: { enabled: true, times: ['08:30', '21:00'] },
    llm: { profiles: [], activeProfileId: null },
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

storage.setItem('mood_tracker_cloud_token', 'legacy-token');
writeLocalAppData(data);
assert.equal(hasLocalBusinessData(), true);
assert.deepEqual(readLocalAppData(), data);
assert.equal(storage.getItem('mood_tracker_cloud_token'), null);

clearLocalAppData();
assert.equal(hasLocalBusinessData(), false);
assert.equal(localStorage.getItem('mood_tracker_entries_v4'), null);
assert.equal(localStorage.getItem('mood_tracker_preferences'), null);

console.log('local data store tests passed');
