import assert from 'node:assert/strict';
import { getHashForTab, getTabFromHash, tabRoutes } from './routes';

assert.equal(getTabFromHash(''), 'report');
assert.equal(getTabFromHash('#/log'), 'log');
assert.equal(getTabFromHash('#/report'), 'report');
assert.equal(getTabFromHash('#/calendar'), 'calendar');
assert.equal(getTabFromHash('#/profile'), 'profile');
assert.equal(getTabFromHash('#/shop'), 'report');
assert.equal(getTabFromHash('#/unknown'), 'report');
assert.equal(getHashForTab('calendar'), '#/calendar');
assert.deepEqual(Object.keys(tabRoutes), ['log', 'report', 'calendar', 'profile']);

console.log('route tests passed');
