import assert from 'node:assert/strict';
import { mergeAutoData, sanitizeAutoData } from './autoData';

const sanitized = sanitizeAutoData({
  steps: { count: '4321', source: 'step-sensor', collectedAt: '2026-08-07T10:00:00Z', isFinal: false },
  weather: {
    weatherCode: 1,
    temperatureC: 28,
    temperatureMaxC: 32,
    temperatureMinC: 24,
    provider: 'open-meteo',
    collectedAt: '2026-08-07T10:00:00Z',
  },
  screenTime: {
    minutes: 120,
    metric: 'screen-interactive',
    collectedAt: '2026-08-07T10:00:00Z',
    isFinal: false,
  },
});

assert.equal(sanitized.steps?.count, 4321);
assert.equal(sanitized.weather?.provider, 'open-meteo');
assert.equal(sanitized.weather?.temperatureMaxC, 32);
assert.equal(sanitized.weather?.temperatureMinC, 24);
assert.equal(sanitized.screenTime?.minutes, 120);
assert.equal(sanitized.screenTime?.metric, 'screen-interactive');

const legacyScreenTime = sanitizeAutoData({
  screenTime: { minutes: 60, collectedAt: '2026-08-07T10:00:00Z', isFinal: true },
});
assert.equal(legacyScreenTime.screenTime?.metric, 'foreground-apps');
assert.deepEqual(mergeAutoData({ steps: sanitized.steps }, { weather: sanitized.weather }), {
  steps: sanitized.steps,
  weather: sanitized.weather,
});
console.log('auto data tests passed');
