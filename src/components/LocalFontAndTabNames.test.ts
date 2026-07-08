import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const fontUrl = new URL('../../public/fonts/inter-v20.woff2', import.meta.url);
const bottomNavSource = appSource.slice(appSource.indexOf('id="bottom-nav-bar"'));

assert.equal(cssSource.includes('fonts.googleapis.com'), false);
assert.equal(cssSource.includes('fonts.gstatic.com'), false);
assert.match(cssSource, /@font-face/);
assert.match(cssSource, /\/fonts\/inter-v20\.woff2/);
assert.equal(existsSync(fontUrl), true);

assert.match(bottomNavSource, />日志</);
assert.match(bottomNavSource, />趋势</);
assert.equal(bottomNavSource.includes('>打卡日志</span>'), false);
assert.equal(bottomNavSource.includes('>趋势报告</span>'), false);

console.log('local font and tab name tests passed');
