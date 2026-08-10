import assert from 'node:assert/strict';
import { formatAutomaticField } from './autoDataFormatters';

assert.equal(
  formatAutomaticField('steps', {
    count: 6432,
    source: 'health-connect',
    collectedAt: '2026-08-07T10:00:00Z',
    isFinal: false,
  }),
  '6,432 步'
);
assert.equal(
  formatAutomaticField('weather', {
    weatherCode: 0,
    temperatureC: 28,
    temperatureMaxC: 32,
    temperatureMinC: 24,
    provider: 'open-meteo',
    collectedAt: '2026-08-07T10:00:00Z',
  }),
  '晴 · 最高 32°C / 最低 24°C'
);
assert.equal(
  formatAutomaticField('screenTime', {
    minutes: 252,
    metric: 'screen-interactive',
    collectedAt: '2026-08-07T10:00:00Z',
    isFinal: false,
  }),
  '4小时12分钟'
);
console.log('automatic formatter tests passed');
