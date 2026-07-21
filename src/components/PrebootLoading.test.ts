import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const syncFeedbackSource = readFileSync(new URL('./SyncFeedback.tsx', import.meta.url), 'utf8');

assert.equal(indexSource.includes('preboot-cloud-loading'), false);
assert.equal(indexSource.includes('mood_tracker_cloud_token'), false);
assert.equal(indexSource.includes('正在拉取云端数据'), false);
assert.equal(syncFeedbackSource.includes('CloudLoadingOverlay'), false);
assert.equal(syncFeedbackSource.includes('fixed inset-0'), false);

console.log('preboot loading tests passed');
