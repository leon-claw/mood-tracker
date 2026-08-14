import assert from 'node:assert/strict';
import {
  createDefaultAppPreferences,
  createDefaultLlmPreferences,
  DEFAULT_REMINDER_TIME,
  MAX_REMINDER_TIMES,
  normalizeAppPreferences,
} from './appPreferences';
import { FIELD_DEFINITIONS } from '../src/fieldSchema';

const defaults = createDefaultAppPreferences();
assert.equal(defaults.enabledRecordFieldIds.includes('autoSteps'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoWeather'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoScreenTime'), false);
assert.deepEqual(defaults.llm, createDefaultLlmPreferences());
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
    llm: createDefaultLlmPreferences(),
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
    llm: createDefaultLlmPreferences(),
  }
);

assert.deepEqual(
  normalizeAppPreferences({
    llm: {
      baseUrl: '  http://10.10.56.34:8000/v1/  ',
      model: '  DeepSeek-V4-Flash  ',
      apiKey: '  dummy  ',
    },
  }).llm,
  {
    profiles: [
      {
        id: 'legacy-llm',
        name: 'DeepSeek-V4-Flash',
        baseUrl: 'http://10.10.56.34:8000/v1',
        model: 'DeepSeek-V4-Flash',
        apiKey: 'dummy',
      },
    ],
    activeProfileId: 'legacy-llm',
  }
);

const migratedLlm = normalizeAppPreferences({
  llm: {
    baseUrl: '  http://10.10.56.34:8000/v1/  ',
    model: '  DeepSeek-V4-Flash  ',
    apiKey: '  dummy  ',
  },
}).llm;
assert.equal(migratedLlm.activeProfileId, 'legacy-llm');
assert.deepEqual(migratedLlm.profiles, [
  {
    id: 'legacy-llm',
    name: 'DeepSeek-V4-Flash',
    baseUrl: 'http://10.10.56.34:8000/v1',
    model: 'DeepSeek-V4-Flash',
    apiKey: 'dummy',
  },
]);

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
