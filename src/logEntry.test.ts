import assert from 'node:assert/strict';
import {
  ENTRY_STORAGE_KEY,
  createDefaultLogValues,
  createLogEntry,
  isLogEntryId,
  isLegacyDemoEntries,
  sanitizeLogValues,
} from './logEntry';
import { INITIAL_DEMO_ENTRIES } from './data/mockData';

assert.equal(ENTRY_STORAGE_KEY, 'mood_tracker_entries_v4');

assert.deepEqual(createDefaultLogValues(), {
  activities: [],
  weather: [],
  social: [],
  achievementMilestones: [],
  journal: '',
  achievement: '',
});

assert.deepEqual(
  sanitizeLogValues({
    moodLevel: 12,
    sleepQuality: -4,
    energyLevel: '8',
    dietHealth: 4.4,
    workEfficiency: undefined,
    activities: ['running', 'coffee', 7] as unknown as string[],
    weather: ['sunny', 'unknown', 9] as unknown as string[],
    social: ['family', 'party', 'queue', false] as unknown as string[],
    achievementMilestones: ['historicalAchievement', 'unknown', 'newStage'] as unknown as string[],
    journal: '  今天不错  ',
    achievement: '  写完一个重要任务  ',
  }),
  {
    sleepQuality: 1,
    moodLevel: 10,
    energyLevel: 8,
    dietHealth: 4,
    activities: ['running'],
    weather: ['sunny'],
    social: ['family', 'party'],
    achievementMilestones: ['historicalAchievement', 'newStage'],
    journal: '今天不错',
    achievement: '写完一个重要任务',
  }
);

const entry = createLogEntry('2026-07-05', {
  moodLevel: 8,
  sleepQuality: 9,
  energyLevel: 7,
  dietHealth: 6,
  workEfficiency: 8,
  activities: ['swimming'],
  weather: ['rainy'],
  social: ['friends'],
  achievementMilestones: ['newStage'],
  journal: '清爽的一天',
  achievement: '完成健身计划',
});
assert.equal(entry.date, '2026-07-05');
assert.equal(isLogEntryId(entry.id), true);
assert.deepEqual(Object.keys(entry.values), [
  'sleepQuality',
  'moodLevel',
  'energyLevel',
  'dietHealth',
  'workEfficiency',
  'activities',
  'weather',
  'social',
  'achievementMilestones',
  'journal',
  'achievement',
]);

assert.ok(INITIAL_DEMO_ENTRIES.length > 0);
assert.ok(INITIAL_DEMO_ENTRIES.every((demo) => 'values' in demo));
assert.ok(INITIAL_DEMO_ENTRIES.every((demo) => {
  assert.deepEqual(Object.keys(demo), ['id', 'date', 'values']);
  assert.deepEqual(Object.keys(demo.values), [
    'sleepQuality',
    'moodLevel',
    'energyLevel',
    'dietHealth',
    'workEfficiency',
    'activities',
    'weather',
    'social',
    'achievementMilestones',
    'journal',
    'achievement',
  ]);
  return true;
}));

assert.equal(isLegacyDemoEntries(INITIAL_DEMO_ENTRIES), true);
assert.equal(
  isLegacyDemoEntries([
    {
      ...INITIAL_DEMO_ENTRIES[0],
      id: 'real-user-entry',
    },
  ]),
  false
);

console.log('log entry tests passed');
