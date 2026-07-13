import assert from 'node:assert/strict';
import {
  getMoodDistributionData,
  getMoodFlowData,
  getSleepMoodData,
} from './reportData';
import { INITIAL_DEMO_ENTRIES } from './data/mockData';
import { LogEntry } from './types';

const flow = getMoodFlowData(INITIAL_DEMO_ENTRIES, 2026, 6);
assert.equal(flow.length, INITIAL_DEMO_ENTRIES.length);
assert.deepEqual(Object.keys(flow[0]), ['date', 'moodLevel', 'sleepQuality', 'journal']);

const distribution = getMoodDistributionData(INITIAL_DEMO_ENTRIES, 2026, 6);
assert.deepEqual(distribution.map((bucket) => bucket.label), ['低落', '有些累', '平稳', '不错', '很好']);
assert.equal(distribution.reduce((sum, bucket) => sum + bucket.count, 0), INITIAL_DEMO_ENTRIES.length);

const sleepMood = getSleepMoodData(INITIAL_DEMO_ENTRIES, 2026, 6);
assert.equal(sleepMood.length, 10);
assert.equal(sleepMood[0].sleepQuality, 1);
assert.equal(sleepMood[9].sleepQuality, 10);
assert.ok(sleepMood.some((item) => item.count > 0 && item.averageMood > 0));

const partialEntries: LogEntry[] = [
  {
    id: 'partial-1',
    date: '2026-07-01',
    values: {
      sleepQuality: 8,
      activities: [],
      weather: [],
      social: [],
      achievementMilestones: [],
      journal: '',
      achievement: '',
    },
  },
  {
    id: 'partial-2',
    date: '2026-07-02',
    values: {
      moodLevel: 9,
      activities: [],
      weather: [],
      social: [],
      achievementMilestones: [],
      journal: '',
      achievement: '',
    },
  },
];

assert.equal(getMoodFlowData(partialEntries, 2026, 7).length, 1);
assert.equal(getMoodDistributionData(partialEntries, 2026, 7).reduce((sum, bucket) => sum + bucket.count, 0), 1);
assert.equal(getSleepMoodData(partialEntries, 2026, 7).reduce((sum, item) => sum + item.count, 0), 0);

console.log('report data tests passed');
