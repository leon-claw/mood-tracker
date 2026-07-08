import assert from 'node:assert/strict';
import { INITIAL_DEMO_ENTRIES } from './data/mockData';
import { buildEntriesByDate, buildMonthGrid, getCalendarMonthSummary, toDateString } from './calendarData';

const juneGrid = buildMonthGrid(2026, 6);
const juneDays = juneGrid.filter((cell) => cell.kind === 'day');

assert.equal(juneGrid.length, 35);
assert.equal(juneGrid[0].kind, 'day');
assert.equal(juneGrid[0].date, '2026-06-01');
assert.equal(juneDays.length, 30);
assert.equal(juneDays.at(-1)?.date, '2026-06-30');

const mayGrid = buildMonthGrid(2026, 5);
assert.equal(mayGrid[0].kind, 'blank');
assert.equal(mayGrid[4].kind, 'day');
assert.equal(mayGrid[4].date, '2026-05-01');

assert.equal(toDateString(2026, 6, 9), '2026-06-09');

const entriesByDate = buildEntriesByDate(INITIAL_DEMO_ENTRIES);
assert.equal(entriesByDate['2026-06-03'].date, '2026-06-03');

const summary = getCalendarMonthSummary(INITIAL_DEMO_ENTRIES, 2026, 6);
assert.equal(summary.loggedDays, 8);
assert.equal(summary.averageMood, 7);

const emptySummary = getCalendarMonthSummary([], 2026, 6);
assert.equal(emptySummary.loggedDays, 0);
assert.equal(emptySummary.averageMood, null);

console.log('calendar data tests passed');
