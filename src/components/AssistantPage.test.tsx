import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantPage } from './AssistantPage';

const markup = renderToStaticMarkup(<AssistantPage llmSettings={null} />);

assert.ok(markup.includes('AI 助手'));
assert.ok(markup.includes('先从今天的状态开始聊聊'));
assert.ok(markup.includes('总结今天'));
assert.ok(markup.includes('看看我的趋势'));
assert.ok(markup.includes('回顾最近情绪'));
assert.match(markup, /placeholder="和 AI 聊聊今天/);
assert.match(markup, /aria-label="发送消息"/);
assert.match(markup, /disabled/);
assert.match(markup, /class="flex h-full min-h-0 flex-col/);
assert.match(markup, /class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto/);
assert.match(markup, /class="rounded-3xl border border-\[#F2EDE9\] bg-white p-4 shadow-xs/);
assert.match(markup, /class="flex h-9 w-9 shrink-0/);
assert.match(markup, /class="min-h-12 flex-1 resize-none rounded-2xl/);
assert.match(markup, /未配置 LLM/);
assert.match(markup, /配置后即可开始对话/);
assert.equal(markup.includes('当前配置：'), false);

console.log('assistant page tests passed');
