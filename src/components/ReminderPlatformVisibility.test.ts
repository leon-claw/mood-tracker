import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const reminderServiceSource = readFileSync(new URL('../reminderService.ts', import.meta.url), 'utf8');
const androidManifest = readFileSync(
  new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url),
  'utf8'
);

assert.match(appSource, /id="profile-settings-group"[\s\S]*?>记录模块[\s\S]*?>打卡提醒/);
assert.match(appSource, /const isNativeMobile = Capacitor\.isNativePlatform\(\)/);
assert.match(appSource, /\{isNativeMobile && \(\s*<button[\s\S]*?>打卡提醒</);
assert.match(appSource, /!isNativeMobile && isReminderSettingsHash/);
assert.match(appSource, /window\.history\.replaceState\(null, '', getHashForTab\('profile'\)\)/);
assert.match(reminderServiceSource, /if \(!isNativeMobilePlatform\(\)\) return 'unsupported'/);
assert.match(reminderServiceSource, /if \(!isNativeMobilePlatform\(\)\) \{\s*return \{ status: 'unsupported'/);
assert.match(androidManifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);

console.log('reminder platform visibility tests passed');
