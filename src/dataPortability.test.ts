import assert from 'node:assert/strict';
import { createExportJson, parseImportJson } from './dataPortability';
import { LogEntry } from './types';

const entries: LogEntry[] = [
  {
    id: 'entry-1',
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

const exportedJson = createExportJson({
  entries,
  points: 120,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
});
const exported = JSON.parse(exportedJson);

assert.equal(exported.app, 'mood-tracker');
assert.equal(exported.version, 1);
assert.equal(typeof exported.exportedAt, 'string');
assert.deepEqual(Object.keys(exported.data), ['entries', 'points', 'unlockedItems', 'isPremiumUnlocked']);
assert.deepEqual(exported.data.entries, entries);
assert.equal(exported.data.points, 120);
assert.deepEqual(exported.data.unlockedItems, ['plant_succulent']);
assert.equal(exported.data.isPremiumUnlocked, true);

assert.deepEqual(parseImportJson(exportedJson), {
  entries,
  points: 120,
  unlockedItems: ['plant_succulent'],
  isPremiumUnlocked: true,
});

assert.deepEqual(
  parseImportJson(JSON.stringify({
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
  })),
  {
    entries: [
      {
        id: 'dirty',
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
  }
);

assert.throws(() => parseImportJson('{not-json'), /无法读取/);
assert.throws(() => parseImportJson(JSON.stringify({ data: { entries: 'bad' } })), /格式不正确/);

console.log('data portability tests passed');
