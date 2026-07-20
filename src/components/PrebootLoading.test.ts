import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const syncFeedbackSource = readFileSync(new URL('./SyncFeedback.tsx', import.meta.url), 'utf8');

assert.match(indexSource, /id="preboot-cloud-loading"/);
assert.match(indexSource, /localStorage\.getItem\('mood_tracker_cloud_token'\)/);
assert.match(indexSource, /正在拉取云端数据/);
assert.match(indexSource, /preboot-cloud-loading'\)\.hidden = false/);
assert.match(syncFeedbackSource, /className="fixed inset-0 z-\[80\]/);

console.log('preboot loading tests passed');
