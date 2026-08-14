import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LlmSettingsPage } from './LlmSettingsPage';

const markup = renderToStaticMarkup(
  <LlmSettingsPage
    settings={{
      activeProfileId: 'local',
      profiles: [
        {
          id: 'local',
          name: '本地 DeepSeek',
          baseUrl: 'http://10.10.56.34:8000/v1',
          model: 'DeepSeek-V4-Flash',
          apiKey: 'dummy',
        },
        {
          id: 'cloud',
          name: '云端备用',
          baseUrl: 'https://example.com/v1',
          model: '备用模型',
          apiKey: 'backup',
        },
      ],
    }}
    onBack={() => undefined}
    onSave={() => undefined}
    onSelectProfile={() => undefined}
  />
);

assert.ok(markup.includes('LLM 设置'));
assert.ok(markup.includes('已保存配置'));
assert.ok(markup.includes('本地 DeepSeek'));
assert.ok(markup.includes('云端备用'));
assert.ok(markup.includes('新建配置'));
assert.ok(markup.includes('配置名称'));
assert.ok(markup.includes('API 地址'));
assert.ok(markup.includes('模型名称'));
assert.ok(markup.includes('API Key'));
assert.ok(markup.includes('保存配置'));
assert.match(markup, /value="http:\/\/10\.10\.56\.34:8000\/v1"/);
assert.match(markup, /value="DeepSeek-V4-Flash"/);
assert.match(markup, /aria-pressed="true"/);
assert.match(markup, /placeholder="sk-\.\.\.\.\.\."/);
assert.equal(markup.includes('本地服务可留空'), false);

console.log('llm settings page tests passed');
