import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const authDialogSource = readFileSync(new URL('./AuthDialog.tsx', import.meta.url), 'utf8');
const sourceChoiceSource = readFileSync(new URL('./DataSourceChoiceDialog.tsx', import.meta.url), 'utf8');
const updatePromptSource = readFileSync(new URL('./UpdatePrompt.tsx', import.meta.url), 'utf8');
const cloudStoreSource = readFileSync(new URL('../cloudDataStore.ts', import.meta.url), 'utf8');
const viteConfigSource = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');

assert.match(authDialogSource, /登录/);
assert.match(authDialogSource, /注册/);
assert.match(authDialogSource, /图形验证码/);
assert.match(authDialogSource, /修改密码/);
assert.match(authDialogSource, /changePassword/);

assert.match(sourceChoiceSource, /使用本地数据/);
assert.match(sourceChoiceSource, /使用云端数据/);
assert.match(sourceChoiceSource, /覆盖云端/);
assert.match(sourceChoiceSource, /清空本地/);

assert.match(updatePromptSource, /下载新版/);
assert.match(updatePromptSource, /稍后再说/);
assert.match(updatePromptSource, /版本更新/);

assert.match(appSource, /DataMode/);
assert.match(appSource, /appConfig\.showCloudAccount/);
assert.match(appSource, /UpdatePrompt/);
assert.match(appSource, /appConfig\.updateManifestUrl/);
assert.match(appSource, /fetchUpdateManifest/);
assert.match(appSource, /isVersionNewer/);
assert.match(appSource, /createCloudDataStore/);
assert.match(appSource, /apiBaseUrl: appConfig\.apiBaseUrl/);
assert.match(appSource, /useBearerToken: true/);
assert.match(appSource, /hasStoredCloudAuthToken/);
assert.match(appSource, /useState<DataMode>\(\(\) => hasInitialCloudToken \? 'cloud' : 'local'\)/);
assert.match(appSource, /useState\(\(\) => hasInitialCloudToken\)/);
assert.match(appSource, /hasLocalBusinessData/);
assert.match(appSource, /DataSourceChoiceDialog/);
assert.match(appSource, /AuthDialog/);
assert.match(appSource, /if \(!showCloudAccount \|\| !hasInitialCloudToken\)/);
assert.match(appSource, /showCloudAccount && \(/);
assert.match(appSource, /handleUseLocalData/);
assert.match(appSource, /handleUseCloudData/);
assert.match(appSource, /handleLogout/);
assert.match(appSource, /cloudStore\.replaceData/);
assert.match(appSource, /CLOUD_SYNC_BATCH_DELAY_MS = 10_000/);
assert.equal(appSource.includes('cloudStore.upsertEntry'), false);
assert.equal(appSource.includes('cloudStore.deleteEntry'), false);
assert.match(appSource, /云端同步/);
assert.match(appSource, /本地模式/);

assert.match(cloudStoreSource, /Authorization/);
assert.match(cloudStoreSource, /CLOUD_AUTH_TOKEN_STORAGE_KEY/);
assert.match(cloudStoreSource, /hasStoredCloudAuthToken/);
assert.match(cloudStoreSource, /credentials: useBearerToken \? 'omit' : 'include'/);
assert.match(viteConfigSource, /proxy/);
assert.match(viteConfigSource, /localhost:4000/);

console.log('auth cloud UI source tests passed');
