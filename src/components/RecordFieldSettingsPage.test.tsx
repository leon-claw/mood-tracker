import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RECORD_FIELD_IDS } from '../../shared/appPreferences';
import { FIELD_DEFINITIONS } from '../fieldSchema';
import { RecordFieldSettingsPage } from './RecordFieldSettingsPage';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

assert.deepEqual(
  FIELD_DEFINITIONS.map((field) => field.id),
  [...RECORD_FIELD_IDS],
  'the fixed settings catalog must stay aligned with the record form catalog'
);

const markup = renderToStaticMarkup(
  <RecordFieldSettingsPage
    enabledFieldIds={['sleepQuality', 'journal']}
    isSyncing={false}
    onBack={() => undefined}
    onToggle={() => undefined}
  />
);

for (const field of FIELD_DEFINITIONS) {
  assert.ok(markup.includes(field.label), `expected settings to include ${field.label}`);
}

assert.ok(markup.includes('2/11'));
assert.ok(markup.includes('记录模块设置'));
assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 2);
assert.equal((markup.match(/aria-pressed="false"/g) || []).length, 9);
assert.ok(markup.includes('不会删除已经保存的历史数据'));
assert.match(appSource, /至少保留一个记录模块/);
assert.match(appSource, /\{!isSecondarySettingsOpen && \(\s*<div id="bottom-nav-bar"/);

console.log('record field settings page tests passed');
