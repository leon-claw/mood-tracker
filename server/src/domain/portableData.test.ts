import assert from 'node:assert/strict';
import {
  createExportEnvelope,
  normalizeSyncData,
  parseImportEnvelope,
  sanitizeServerLogValues,
} from './portableData';

const dirtyValues = sanitizeServerLogValues({
  sleepQuality: 0,
  moodLevel: 12,
  energyLevel: '8',
  dietHealth: 6.6,
  workEfficiency: undefined,
  activities: ['running', 'coffee', 'fitness'],
  weather: ['sunny', 'mist'],
  social: ['party', 'queue'],
  achievementMilestones: ['newStage', 'old'],
  journal: '  今天不错  ',
  achievement: '  完成后端测试  ',
});

assert.deepEqual(dirtyValues, {
  sleepQuality: 1,
  moodLevel: 10,
  energyLevel: 8,
  dietHealth: 7,
  workEfficiency: 1,
  activities: ['running', 'fitness'],
  weather: ['sunny'],
  social: ['party'],
  achievementMilestones: ['newStage'],
  journal: '今天不错',
  achievement: '完成后端测试',
});

const normalized = normalizeSyncData({
  entries: [
    {
      id: 'existing-entry',
      date: '2026-07-08',
      values: dirtyValues,
    },
    {
      id: 7,
      date: 'bad-date',
      values: {},
    },
  ],
  points: '42',
  unlockedItems: ['plant_succulent', false, 'badge_focus'],
  isPremiumUnlocked: true,
});

assert.deepEqual(normalized, {
  entries: [
    {
      id: 'existing-entry',
      date: '2026-07-08',
      values: dirtyValues,
    },
  ],
  points: 42,
  unlockedItems: ['plant_succulent', 'badge_focus'],
  isPremiumUnlocked: true,
});

const envelope = createExportEnvelope(normalized, new Date('2026-07-08T00:00:00.000Z'));
assert.equal(envelope.app, 'mood-tracker');
assert.equal(envelope.version, 1);
assert.equal(envelope.exportedAt, '2026-07-08T00:00:00.000Z');
assert.deepEqual(envelope.data, normalized);

assert.deepEqual(parseImportEnvelope(envelope), normalized);
assert.deepEqual(parseImportEnvelope(JSON.stringify(envelope)), normalized);
assert.throws(() => normalizeSyncData({ entries: 'bad' }), /entries/);
assert.throws(() => parseImportEnvelope('{bad-json'), /无法读取/);
assert.throws(() => parseImportEnvelope({ app: 'other', data: normalized }), /格式不正确/);

console.log('server portable data tests passed');
