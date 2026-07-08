import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const sleepMoodSource = readFileSync(new URL('./SleepMoodChart.tsx', import.meta.url), 'utf8');

assert.equal(appSource.includes("import { INITIAL_DEMO_ENTRIES }"), false);
assert.equal(appSource.includes('return INITIAL_DEMO_ENTRIES'), false);
assert.equal(appSource.includes('ActivityRanking'), false);
assert.equal(appSource.includes('loggedTodayCount'), false);
assert.equal(appSource.includes(' 次</span>'), false);
assert.equal(sleepMoodSource.includes('例子'), false);

console.log('report cleanup tests passed');
