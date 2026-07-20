import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const boundarySource = readFileSync(new URL('./AppErrorBoundary.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

assert.match(mainSource, /<AppErrorBoundary>/);
assert.match(boundarySource, /getDerivedStateFromError/);
assert.match(boundarySource, /页面加载遇到问题/);
assert.match(boundarySource, /重新加载/);
assert.match(boundarySource, /CLOUD_AUTH_TOKEN_STORAGE_KEY/);
assert.match(boundarySource, /返回本地模式/);

console.log('app error boundary tests passed');
