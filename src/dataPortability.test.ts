import assert from 'node:assert/strict';
import { createExportJson, normalizeAppData, parseImportJson } from './dataPortability';
import { LogEntry } from './types';
import { AppPreferences, createDefaultAppPreferences } from '../shared/appPreferences';
import { isLogEntryId } from './logEntry';

const validEntryId = '5fd3db76-8db6-4bf7-981e-7268f4426107';

const entries: LogEntry[] = [
  {
    id: validEntryId,
    date: '2026-07-07',
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
      journal: '今天状态不错',
      achievement: '完成一次导出测试',
    },
  },
];
const preferences: AppPreferences = {
  enabledRecordFieldIds: ['sleepQuality', 'moodLevel', 'journal'],
  reminders: { enabled: true, times: ['09:00', '21:00'] },
};

const exportedJson = createExportJson({
  entries,
  points: 120,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
  preferences,
});
const exported = JSON.parse(exportedJson);

assert.equal(exported.app, 'mood-tracker');
assert.equal(exported.version, 1);
assert.equal(typeof exported.exportedAt, 'string');
assert.deepEqual(Object.keys(exported.data), ['entries', 'points', 'unlockedItems', 'isPremiumUnlocked', 'preferences']);
assert.deepEqual(exported.data.entries, entries);
assert.equal(exported.data.points, 120);
assert.deepEqual(exported.data.unlockedItems, ['plant_succulent']);
assert.equal(exported.data.isPremiumUnlocked, true);
assert.deepEqual(exported.data.preferences, preferences);

assert.deepEqual(parseImportJson(exportedJson), {
  entries,
  points: 120,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
  preferences,
});

const sanitizedImport = parseImportJson(JSON.stringify({
    app: 'mood-tracker',
    version: 1,
    data: {
      entries: [
        {
          id: 'dirty',
          date: '2026-07-08',
          values: {
            moodLevel: 20,
            sleepQuality: 0,
            activities: ['running', 'coffee'],
            social: ['party', 'queue'],
            journal: '  清洗一下  ',
          },
        },
        { id: 9, date: 'bad-date', values: {} },
      ],
      points: '88',
      unlockedItems: ['plant_succulent', 12, 'badge_focus'],
      isPremiumUnlocked: false,
    },
  }));

assert.equal(isLogEntryId(sanitizedImport.entries[0].id), true);
assert.notEqual(sanitizedImport.entries[0].id, 'dirty');
assert.deepEqual(
  sanitizedImport,
  {
    entries: [
      {
        id: sanitizedImport.entries[0].id,
        date: '2026-07-08',
        values: {
          sleepQuality: 1,
          moodLevel: 10,
          activities: ['running'],
          weather: [],
          social: ['party'],
          achievementMilestones: [],
          journal: '清洗一下',
          achievement: '',
        },
      },
    ],
    points: 88,
    unlockedItems: ['plant_succulent', 'badge_focus'],
    isPremiumUnlocked: false,
    preferences: createDefaultAppPreferences(),
  }
);

assert.deepEqual(
  parseImportJson(JSON.stringify({
    app: 'mood-tracker',
    version: 1,
    data: {
      entries: [],
      preferences: { enabledRecordFieldIds: ['journal', 'unknown', 'journal'] },
    },
  })).preferences,
  {
    enabledRecordFieldIds: ['journal'],
    reminders: createDefaultAppPreferences().reminders,
  }
);

assert.deepEqual(
  parseImportJson(JSON.stringify({
    app: 'mood-tracker',
    version: 1,
    data: { entries: [], preferences: { enabledRecordFieldIds: [] } },
  })).preferences,
  createDefaultAppPreferences()
);

assert.deepEqual(
  normalizeAppData({
    entries: [],
    points: 12,
    preferences: { enabledRecordFieldIds: ['moodLevel', 'journal'] },
  }).preferences,
  {
    enabledRecordFieldIds: ['moodLevel', 'journal'],
    reminders: createDefaultAppPreferences().reminders,
  },
  'old cloud data should receive newly introduced preference defaults'
);

assert.throws(() => parseImportJson('{not-json'), /无法读取/);
assert.throws(() => parseImportJson(JSON.stringify({ data: { entries: 'bad' } })), /格式不正确/);

console.log('data portability tests passed');
