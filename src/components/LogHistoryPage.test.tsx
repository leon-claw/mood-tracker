import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLogEntry } from '../logEntry';
import { LogHistoryPage } from './LogHistoryPage';

const entry = createLogEntry('2026-08-14', {
  moodLevel: 8,
  sleepQuality: 7,
  journal: '今天状态不错',
});

const markup = renderToStaticMarkup(
  <LogHistoryPage
    entries={[entry]}
    searchQuery=""
    selectedMoodFilter={null}
    onSearchQueryChange={() => undefined}
    onMoodFilterChange={() => undefined}
    onDelete={() => undefined}
    onBack={() => undefined}
  />
);

assert.ok(markup.includes('日志历史'));
assert.ok(markup.includes('今天状态不错'));
assert.ok(markup.includes('搜索日志备注内容'));
assert.ok(markup.includes('返回我的'));
assert.match(markup, /aria-label="删除记录"/);

console.log('log history page tests passed');
