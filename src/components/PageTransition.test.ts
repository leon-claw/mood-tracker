import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./PageTransition.tsx', import.meta.url), 'utf8');

assert.match(source, /motion\.div/);
assert.match(source, /disableInitialAnimation/);
assert.match(source, /initial=\{disableInitialAnimation \? false : \{ opacity: 0, y: 8 \}\}/);
assert.match(source, /animate=\{\{ opacity: 1, y: 0 \}\}/);
assert.match(source, /exit=\{\{ opacity: 0, y: -6 \}\}/);
assert.match(source, /duration: 0\.18/);

console.log('page transition tests passed');
