import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

assert.equal(appSource.includes('个人中心'), false);
assert.match(appSource, />我的</);
assert.equal(appSource.includes('id="profile-development-overlay"'), false);
assert.equal(appSource.includes('还在开发中...'), false);
assert.match(appSource, /数据管理/);
assert.match(appSource, /导出 JSON/);
assert.match(appSource, /导入 JSON/);
assert.match(appSource, /handleExportData/);
assert.match(appSource, /handleImportDataFile/);

console.log('profile data management tests passed');
