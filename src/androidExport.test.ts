import assert from 'node:assert/strict';
import { exportJsonFile } from './androidExport';

const originalDocument = globalThis.document;
const originalUrl = globalThis.URL;

let clicked = false;
let appended = false;
let removed = false;
let objectUrlInput: Blob | null = null;
let revokedUrl = '';

const anchor = {
  href: '',
  download: '',
  click: () => {
    clicked = true;
  },
  remove: () => {
    removed = true;
  },
};

Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: (tagName: string) => {
      assert.equal(tagName, 'a');
      return anchor;
    },
    body: {
      appendChild: () => {
        appended = true;
      },
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: (blob: Blob) => {
      objectUrlInput = blob;
      return 'blob:backup';
    },
    revokeObjectURL: (url: string) => {
      revokedUrl = url;
    },
  },
  configurable: true,
});

await exportJsonFile({
  json: '{"ok":true}',
  filename: 'backup.json',
});

assert.equal(clicked, true);
assert.equal(appended, true);
assert.equal(removed, true);
assert.equal(anchor.href, 'blob:backup');
assert.equal(anchor.download, 'backup.json');
assert.equal(revokedUrl, 'blob:backup');
assert.equal(objectUrlInput instanceof Blob, true);

clicked = false;
appended = false;
removed = false;

const calls: string[] = [];
await exportJsonFile({
  json: '{"ok":true}',
  filename: 'backup.json',
  bridge: {
    writeTextFile: async ({ path, data }) => {
      calls.push(`write:${path}:${data}`);
      return { uri: 'file://backup.json' };
    },
    shareFile: async ({ uri, title }) => {
      calls.push(`share:${uri}:${title}`);
    },
  },
});

assert.deepEqual(calls, [
  'write:backup.json:{"ok":true}',
  'share:file://backup.json:Mood Tracker JSON 备份',
]);
assert.equal(clicked, false);
assert.equal(appended, false);
assert.equal(removed, false);

Object.defineProperty(globalThis, 'document', {
  value: originalDocument,
  configurable: true,
});
Object.defineProperty(globalThis, 'URL', {
  value: originalUrl,
  configurable: true,
});

console.log('android export tests passed');
