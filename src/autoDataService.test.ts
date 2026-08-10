import assert from 'node:assert/strict';
import {
  getModulesToCollect,
  hasManualLogValues,
  mergePendingAutoDataIntoEntries,
} from './autoDataService';
import { createLogEntry } from './logEntry';

const collectedAt = '2026-08-07T08:00:00.000Z';

assert.deepEqual(
  getModulesToCollect(['moodLevel', 'autoSteps', 'autoWeather', 'autoSteps']),
  ['steps', 'weather'],
);
assert.deepEqual(getModulesToCollect(['moodLevel', 'journal']), []);

const existing = createLogEntry('2026-08-07', { moodLevel: 8 });
const merged = mergePendingAutoDataIntoEntries(
  [existing],
  [{
    date: '2026-08-07',
    autoData: {
      steps: { count: 1200, source: 'step-sensor', collectedAt, isFinal: false },
    },
  }],
  ['moodLevel', 'autoSteps'],
);
assert.equal(merged.length, 1);
assert.equal(merged[0].id, existing.id);
assert.equal(merged[0].values.moodLevel, 8);
assert.equal(merged[0].autoData?.steps?.count, 1200);

const autoOnly = mergePendingAutoDataIntoEntries(
  [],
  [{
    date: '2026-08-06',
    autoData: {
      screenTime: { minutes: 42, metric: 'screen-interactive', collectedAt, isFinal: false },
    },
  }],
  ['autoScreenTime'],
);
assert.equal(autoOnly.length, 1);
assert.equal(autoOnly[0].values.journal, '');
assert.equal(autoOnly[0].autoData?.screenTime?.minutes, 42);
assert.equal(autoOnly[0].autoData?.screenTime?.metric, 'screen-interactive');
assert.equal(hasManualLogValues(autoOnly[0].values), false);
assert.equal(hasManualLogValues(existing.values), true);

const disabled = mergePendingAutoDataIntoEntries(
  [],
  [{
    date: '2026-08-07',
    autoData: {
      steps: { count: 1200, source: 'step-sensor', collectedAt, isFinal: false },
    },
  }],
  ['moodLevel'],
);
assert.deepEqual(disabled, []);

console.log('auto data service tests passed');
