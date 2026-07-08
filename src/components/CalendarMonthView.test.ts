import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CalendarMonthView.tsx', import.meta.url), 'utf8');
const dateGridSource = source.slice(source.indexOf('grid grid-cols-7 gap-1.5'));

assert.equal(source.includes("Smile"), false, 'calendar date cells must not render mood icons');
assert.equal(dateGridSource.includes('/10'), false, 'calendar date cells must not show x/10 text');
assert.equal(source.includes('getActivityOption'), false, 'calendar date cells must not render activity emoji markers');
assert.match(source, /h-14/);
assert.match(source, /min-h-14/);

console.log('calendar month view tests passed');
