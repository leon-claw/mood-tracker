import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildReminderNotifications,
  buildTestReminderNotification,
  getReminderNotificationId,
  REMINDER_CHANNEL_ID,
  REMINDER_TEST_DELAY_MS,
  REMINDER_TEST_NOTIFICATION_ID,
} from './reminderService';

assert.equal(getReminderNotificationId('00:00'), 730_000);
assert.equal(getReminderNotificationId('23:59'), 731_439);
assert.equal(REMINDER_TEST_DELAY_MS, 30_000);

const androidNotifications = buildReminderNotifications({
  enabled: true,
  times: ['08:30', '21:00'],
}, 'android');

assert.equal(androidNotifications.length, 2);
assert.deepEqual(androidNotifications[0].schedule, {
  on: { hour: 8, minute: 30 },
  allowWhileIdle: true,
});
assert.equal(androidNotifications[0].channelId, REMINDER_CHANNEL_ID);
assert.equal(androidNotifications[0].extra.kind, 'check-in-reminder');
assert.equal(buildReminderNotifications({ enabled: true, times: ['09:00'] }, 'ios')[0].channelId, undefined);
assert.equal(buildReminderNotifications({ enabled: true, times: ['09:00'] }, 'ios')[0].schedule?.allowWhileIdle, false);

const testFireAt = new Date('2026-07-22T12:00:30.000Z');
const testNotification = buildTestReminderNotification(testFireAt, 'android');
assert.equal(testNotification.id, REMINDER_TEST_NOTIFICATION_ID);
assert.deepEqual(testNotification.schedule, { at: testFireAt, allowWhileIdle: true });
assert.equal(testNotification.channelId, REMINDER_CHANNEL_ID);
assert.equal(testNotification.extra?.kind, 'check-in-reminder');

const reminderServiceSource = readFileSync(new URL('./reminderService.ts', import.meta.url), 'utf8');
assert.match(
  reminderServiceSource,
  /return \{ notifications: module\.LocalNotifications \};/,
  'the Capacitor plugin proxy must be wrapped before crossing an async boundary'
);
assert.doesNotMatch(
  reminderServiceSource,
  /\(await import\('@capacitor\/local-notifications'\)\)\.LocalNotifications/,
  'returning the plugin proxy directly makes Promise invoke LocalNotifications.then()'
);
assert.match(reminderServiceSource, /checkExactNotificationSetting\(\)/);
assert.match(reminderServiceSource, /changeExactNotificationSetting\(\)/);
assert.match(reminderServiceSource, /pendingAfterSchedule/);

console.log('reminder service tests passed');
