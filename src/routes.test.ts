import assert from 'node:assert/strict';
import {
  assistantRoute,
  getHashForTab,
  getTabFromHash,
  isLlmSettingsHash,
  isLogHistoryHash,
  isRecordFieldSettingsHash,
  isReminderSettingsHash,
  logHistoryRoute,
  llmSettingsRoute,
  recordFieldSettingsRoute,
  reminderSettingsRoute,
  tabRoutes,
} from './routes';

assert.equal(getTabFromHash(''), 'report');
assert.equal(assistantRoute, '#/assistant');
assert.equal(logHistoryRoute, '#/profile/log-history');
assert.equal(getTabFromHash('#/assistant'), 'assistant');
assert.equal(getTabFromHash('#/log'), 'assistant');
assert.equal(getTabFromHash('#/report'), 'report');
assert.equal(getTabFromHash('#/calendar'), 'calendar');
assert.equal(getTabFromHash('#/profile'), 'profile');
assert.equal(getTabFromHash(logHistoryRoute), 'profile');
assert.equal(isLogHistoryHash(logHistoryRoute), true);
assert.equal(isLogHistoryHash('#/profile'), false);
assert.equal(getTabFromHash(recordFieldSettingsRoute), 'profile');
assert.equal(getTabFromHash(reminderSettingsRoute), 'profile');
assert.equal(getTabFromHash(llmSettingsRoute), 'profile');
assert.equal(isLlmSettingsHash(llmSettingsRoute), true);
assert.equal(isLlmSettingsHash('#/profile'), false);
assert.equal(isRecordFieldSettingsHash('#/profile/record-fields'), true);
assert.equal(isReminderSettingsHash('#/profile/reminders'), true);
assert.equal(getTabFromHash('#/shop'), 'report');
assert.equal(getTabFromHash('#/unknown'), 'report');
assert.equal(getHashForTab('assistant'), '#/assistant');
assert.equal(getHashForTab('calendar'), '#/calendar');
assert.deepEqual(Object.keys(tabRoutes), ['assistant', 'report', 'calendar', 'profile']);

console.log('route tests passed');
