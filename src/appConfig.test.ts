import assert from 'node:assert/strict';
import { createAppConfig } from './appConfig';

const defaultConfig = createAppConfig({});
assert.equal(defaultConfig.appVersion, '0.0.0');
assert.equal(defaultConfig.updateManifestUrl, '');
assert.equal(defaultConfig.isNativeAndroid, false);

const androidConfig = createAppConfig({
  VITE_ANDROID_APP_VERSION: '1.2.3',
  VITE_ANDROID_UPDATE_URL: ' https://example.com/latest.json ',
  VITE_CAPACITOR_PLATFORM: 'android',
});

assert.equal(androidConfig.appVersion, '1.2.3');
assert.equal(androidConfig.updateManifestUrl, 'https://example.com/latest.json');
assert.equal(androidConfig.isNativeAndroid, true);

console.log('app config tests passed');
