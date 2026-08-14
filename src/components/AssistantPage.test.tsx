import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantPage } from './AssistantPage';

const markup = renderToStaticMarkup(<AssistantPage />);

assert.ok(markup.includes('AI 助手'));
assert.ok(markup.includes('先从今天的状态开始聊聊'));
assert.ok(markup.includes('总结今天'));
assert.ok(markup.includes('看看我的趋势'));
assert.ok(markup.includes('回顾最近情绪'));
assert.ok(markup.includes('当前为界面预览'));
assert.match(markup, /placeholder="和 AI 聊聊今天/);
assert.match(markup, /aria-label="发送消息"/);
assert.match(markup, /disabled/);

console.log('assistant page tests passed');
