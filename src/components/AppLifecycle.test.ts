import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

assert.match(appSource, /document\.addEventListener\('visibilitychange', handleVisibilityChange\)/);
assert.match(appSource, /window\.addEventListener\('pageshow', refreshDateContext\)/);
assert.match(appSource, /CapacitorApp\.addListener\('appStateChange'/);
assert.match(appSource, /if \(!isActive\) return/);
assert.match(appSource, /syncCheckInReminderSchedule\(preferencesRef\.current\.reminders\)/);
assert.match(appSource, /setCurrentDate\(next\.date\)/);
assert.match(appSource, /setSelectedYear\(next\.year\)/);
assert.match(appSource, /setSelectedMonth\(next\.month\)/);
assert.match(appSource, /setCalendarYear\(next\.year\)/);
assert.match(appSource, /setCalendarMonth\(next\.month\)/);
assert.match(appSource, /todayDate=\{currentDate\}/);
assert.match(appSource, /entry\.date === currentDate/);

console.log('app lifecycle tests passed');
