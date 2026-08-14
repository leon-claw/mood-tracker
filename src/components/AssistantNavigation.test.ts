import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

assert.match(appSource, /<AssistantPage/);
assert.match(appSource, /<LogHistoryPage/);
assert.match(appSource, /<LlmSettingsPage/);
assert.match(appSource, /isLogHistoryOpen/);
assert.match(appSource, /isLlmSettingsOpen/);
assert.match(appSource, /logHistoryRoute/);
assert.match(appSource, /llmSettingsRoute/);
assert.match(appSource, />AI</);
assert.match(appSource, />日志历史</);
assert.match(appSource, /navigateToLogHistory/);
assert.match(appSource, /navigateToLlmSettings/);
assert.match(appSource, /preferences\.llm/);
assert.match(appSource, /activeProfileId/);
assert.match(appSource, /profiles/);
assert.match(appSource, /onSelectProfile/);
assert.match(appSource, /activeTab === 'assistant'/);
assert.match(appSource, /overflow-hidden pb-24/);
assert.equal(appSource.includes("activeTab === 'log'"), false);

console.log('assistant navigation tests passed');
