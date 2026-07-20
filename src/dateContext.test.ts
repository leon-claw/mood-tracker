import assert from 'node:assert/strict';
import { formatLocalDate, getCurrentDateContext } from './dateContext';

const lateEvening = new Date(2026, 6, 19, 23, 59, 59);

assert.equal(formatLocalDate(lateEvening), '2026-07-19');
assert.deepEqual(getCurrentDateContext(lateEvening), {
  date: '2026-07-19',
  year: 2026,
  month: 7,
});

const newYear = new Date(2027, 0, 1, 0, 0, 1);
assert.equal(formatLocalDate(newYear), '2027-01-01');

console.log('date context tests passed');
