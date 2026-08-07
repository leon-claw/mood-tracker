import assert from 'node:assert/strict';
import {
  createDefaultAppPreferences,
  DEFAULT_REMINDER_TIME,
  MAX_REMINDER_TIMES,
  normalizeAppPreferences,
} from './appPreferences';
import { FIELD_DEFINITIONS } from '../src/fieldSchema';

const defaults = createDefaultAppPreferences();
assert.equal(defaults.enabledRecordFieldIds.includes('autoSteps'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoWeather'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoScreenTime'), false);
assert.deepEqual(
  FIELD_DEFINITIONS.map((field) => field.id),
  [...new Set([...defaults.enabledRecordFieldIds, 'autoSteps', 'autoWeather', 'autoScreenTime'])]
);
assert.equal(normalizeAppPreferences({ enabledRecordFieldIds: ['autoWeather'] }).enabledRecordFieldIds.includes('autoWeather'), true);

assert.deepEqual(
  normalizeAppPreferences({ enabledRecordFieldIds: ['journal'] }),
  {
    enabledRecordFieldIds: ['journal'],
    reminders: { enabled: false, times: [DEFAULT_REMINDER_TIME] },
  },
  'old preferences should receive the default reminder configuration'
);

assert.deepEqual(
  normalizeAppPreferences({
    enabledRecordFieldIds: ['moodLevel'],
    reminders: {
      enabled: true,
      times: ['21:30', '08:00', '99:00', '08:00', '09:00', '10:00', '11:00', '12:00'],
    },
  }),
  {
    enabledRecordFieldIds: ['moodLevel'],
    reminders: {
      enabled: true,
      times: ['08:00', '09:00', '10:00', '11:00', '12:00'].slice(0, MAX_REMINDER_TIMES),
    },
  }
);

assert.deepEqual(
  normalizeAppPreferences({
    enabledRecordFieldIds: ['journal'],
    reminders: { enabled: true, times: [] },
  }).reminders,
  { enabled: false, times: [] },
  'an empty reminder list should also turn reminders off'
);

assert.deepEqual(normalizeAppPreferences(undefined), createDefaultAppPreferences());

console.log('app preferences tests passed');
