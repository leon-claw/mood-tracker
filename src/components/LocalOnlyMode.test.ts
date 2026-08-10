import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const appConfigSource = readFileSync(new URL('../appConfig.ts', import.meta.url), 'utf8');
const localStoreSource = readFileSync(new URL('../localDataStore.ts', import.meta.url), 'utf8');

assert.match(appSource, /本地存储/);
assert.match(appConfigSource, /isNativeAndroid/);
assert.match(localStoreSource, /mood_tracker_cloud_token/);

console.log('local-only mode source tests passed');
