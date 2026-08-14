import assert from 'node:assert/strict';
import { requestLlmChat } from './llmClient';

const settings = {
  id: 'local',
  name: '本地 DeepSeek',
  baseUrl: 'http://10.10.56.34:8000/v1/',
  model: 'DeepSeek-V4-Flash',
  apiKey: 'dummy',
};

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const reply = await requestLlmChat(
  settings,
  [{ role: 'user', content: '你好' }],
  async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({
      choices: [{ message: { content: '你好，我在。' } }],
    }), { status: 200 });
  }
);

assert.equal(capturedUrl, 'http://10.10.56.34:8000/v1/chat/completions');
assert.equal(new Headers(capturedInit?.headers).get('Authorization'), 'Bearer dummy');
assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
  model: 'DeepSeek-V4-Flash',
  messages: [{ role: 'user', content: '你好' }],
  stream: false,
});
assert.equal(reply, '你好，我在。');

let noKeyHeaders: Headers | undefined;
await requestLlmChat(
  { ...settings, apiKey: '' },
  [],
  async (_input, init) => {
    noKeyHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
  }
);
assert.equal(noKeyHeaders?.has('Authorization'), false);

await assert.rejects(
  requestLlmChat(settings, [], async () => new Response(JSON.stringify({ error: { message: '服务不可用' } }), { status: 503 })),
  /服务不可用/
);

await assert.rejects(
  requestLlmChat(settings, [], async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })),
  /返回内容为空/
);

console.log('llm client tests passed');
