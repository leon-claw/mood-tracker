import assert from 'node:assert/strict';
import { fetchUpdateManifest, isVersionNewer, parseUpdateManifest } from './updateCheck';

assert.equal(isVersionNewer('1.0.1', '1.0.0'), true);
assert.equal(isVersionNewer('1.1.0', '1.0.9'), true);
assert.equal(isVersionNewer('2.0.0', '1.9.9'), true);
assert.equal(isVersionNewer('1.0.0', '1.0.1'), false);
assert.equal(isVersionNewer('1.0.0', '1.0.0'), false);
assert.equal(isVersionNewer('bad', '1.0.0'), false);

assert.deepEqual(
  parseUpdateManifest({
    version: '1.0.1',
    apkUrl: 'https://example.com/mood-tracker.apk',
    notes: '修复导出体验',
  }),
  {
    version: '1.0.1',
    apkUrl: 'https://example.com/mood-tracker.apk',
    notes: '修复导出体验',
  }
);

assert.deepEqual(
  parseUpdateManifest({
    version: '1.0.1',
    apkUrl: 'https://example.com/mood-tracker.apk',
  }),
  {
    version: '1.0.1',
    apkUrl: 'https://example.com/mood-tracker.apk',
    notes: '',
  }
);

assert.equal(parseUpdateManifest({ version: '1.0.1' }), null);
assert.equal(parseUpdateManifest(null), null);

const manifest = await fetchUpdateManifest('https://example.com/latest.json', async (input) => {
  assert.equal(input, 'https://example.com/latest.json');
  return new Response(JSON.stringify({
    version: '1.0.2',
    apkUrl: 'https://example.com/mood-tracker-1.0.2.apk',
    notes: '更新说明',
  }));
});

assert.deepEqual(manifest, {
  version: '1.0.2',
  apkUrl: 'https://example.com/mood-tracker-1.0.2.apk',
  notes: '更新说明',
});

const failedManifest = await fetchUpdateManifest('https://example.com/latest.json', async () => (
  new Response('nope', { status: 500 })
));
assert.equal(failedManifest, null);

console.log('update check tests passed');
