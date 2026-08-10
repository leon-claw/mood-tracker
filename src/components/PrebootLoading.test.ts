import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const toastSource = readFileSync(new URL('./Toast.tsx', import.meta.url), 'utf8');

assert.equal(indexSource.includes('preboot'), false);
assert.equal(indexSource.includes('mood_tracker_'), false);
assert.equal(toastSource.includes('fixed inset-0'), false);

console.log('preboot loading tests passed');
