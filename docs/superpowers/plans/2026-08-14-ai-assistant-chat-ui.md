# AI Assistant Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-navigation log entry with a local AI assistant chat UI and move the existing log history page into the profile settings area without changing record behavior.

**Architecture:** Add an explicit `assistant` application tab and a `log-history` profile sub-route. Keep the AI UI in a self-contained `AssistantPage` with in-memory placeholder messages, and extract the existing log-history rendering into a `LogHistoryPage` that receives data and callbacks from `App.tsx`. `App.tsx` remains the owner of navigation, record state, deletion confirmation, and local persistence.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, lucide-react, Motion page transitions, Node `assert` tests executed through `tsx`.

## Global Constraints

- Bottom navigation keeps four positions: `AI`, `趋势`, `日历`, `我的`.
- The center `+` action continues to open the existing daily record modal.
- `#/log` remains a compatible legacy route and resolves to the AI tab.
- `#/profile/log-history` is the new log-history route and hides the bottom navigation while open.
- This phase does not call `@google/genai`, read an API key, make network requests, or persist chat messages.
- Existing record data, automatic device data, localStorage format, search/filter behavior, deletion flow, and Android behavior remain unchanged.
- UI must follow the existing natural wellness design system: `#F9F8F6` phone surface, white rounded cards, sage `#8FA88B` primary actions, soft borders, Lucide icons, and mobile-first spacing.
- Do not include the existing `.gitignore` or `.vscode/` changes in feature commits.

---

## File Map

Create:

- `src/components/AssistantPage.tsx` — local AI conversation UI and temporary message state.
- `src/components/AssistantPage.test.tsx` — static rendering coverage for the assistant UI contract.
- `src/components/LogHistoryPage.tsx` — extracted log-history screen with explicit props and callbacks.
- `src/components/LogHistoryPage.test.tsx` — rendering coverage for log-history controls and callbacks.
- `src/components/AssistantNavigation.test.ts` — source-level regression coverage for App navigation wiring.
- `docs/superpowers/plans/2026-08-14-ai-assistant-chat-ui.md` — this implementation plan.

Modify:

- `src/routes.ts` — replace the semantic `log` tab with `assistant`, add the log-history profile route, and preserve `#/log` compatibility.
- `src/routes.test.ts` — verify assistant, legacy log, log-history, and existing settings route resolution.
- `src/App.tsx` — wire new routes and state, render the assistant and extracted history pages, add the settings entry, and rename the bottom-nav item.
- `src/components/LocalFontAndTabNames.test.ts` — expect `AI` in the bottom navigation and reject the old bottom-nav `日志` label.

---

### Task 1: Add explicit assistant and log-history routes

**Files:**

- Modify: `src/routes.ts`
- Test: `src/routes.test.ts`

**Interfaces:**

- Produces `AppTab = 'assistant' | 'report' | 'calendar' | 'profile'`.
- Produces `logHistoryRoute = '#/profile/log-history'`.
- Produces `isLogHistoryHash(hash: string): boolean`.
- Preserves `recordFieldSettingsRoute`, `reminderSettingsRoute`, and their helpers.

- [ ] **Step 1: Write the failing route assertions**

Add these assertions to `src/routes.test.ts`:

```ts
import { assistantRoute, isLogHistoryHash, logHistoryRoute } from './routes';

assert.equal(assistantRoute, '#/assistant');
assert.equal(logHistoryRoute, '#/profile/log-history');
assert.equal(getTabFromHash('#/assistant'), 'assistant');
assert.equal(getTabFromHash('#/log'), 'assistant');
assert.equal(getTabFromHash(logHistoryRoute), 'profile');
assert.equal(isLogHistoryHash(logHistoryRoute), true);
assert.equal(isLogHistoryHash('#/profile'), false);
assert.equal(getHashForTab('assistant'), '#/assistant');
assert.deepEqual(Object.keys(tabRoutes), ['assistant', 'report', 'calendar', 'profile']);
```

- [ ] **Step 2: Run the focused route test and verify the expected red state**

Run:

```bash
pnpm exec tsx src/routes.test.ts
```

Expected: FAIL because `assistantRoute`, `logHistoryRoute`, and the `assistant` tab do not yet exist.

- [ ] **Step 3: Implement the route model**

Update `src/routes.ts` with this behavior:

```ts
export type AppTab = 'assistant' | 'report' | 'calendar' | 'profile';

export const assistantRoute = '#/assistant';
export const logHistoryRoute = '#/profile/log-history';

export const tabRoutes: Record<AppTab, string> = {
  assistant: assistantRoute,
  report: '#/report',
  calendar: '#/calendar',
  profile: '#/profile',
};

export const isLogHistoryHash = (hash: string) => hash === logHistoryRoute;

export const getTabFromHash = (hash: string): AppTab => {
  if (
    isLogHistoryHash(hash) ||
    isRecordFieldSettingsHash(hash) ||
    isReminderSettingsHash(hash)
  ) return 'profile';
  if (hash === '#/log') return 'assistant';
  const match = Object.entries(tabRoutes).find(([, route]) => route === hash);
  return (match?.[0] as AppTab | undefined) || 'report';
};
```

Keep `getHashForTab` as `tabRoutes[tab]`; do not expose `log` as a current tab.

- [ ] **Step 4: Run the focused route test and verify it passes**

Run:

```bash
pnpm exec tsx src/routes.test.ts
```

Expected: PASS with the route test success message.

- [ ] **Step 5: Commit the route boundary**

```bash
git add src/routes.ts src/routes.test.ts
git commit -m "refactor: add assistant and log history routes"
```

---

### Task 2: Build the self-contained assistant page

**Files:**

- Create: `src/components/AssistantPage.tsx`
- Test: `src/components/AssistantPage.test.tsx`

**Interfaces:**

- `AssistantPage` takes no required props.
- It owns temporary messages and input state only; it does not import `App`, `localDataStore`, `@google/genai`, or fetch APIs.
- A message has `id: string`, `role: 'assistant' | 'user'`, and `content: string`.

- [ ] **Step 1: Write the failing assistant rendering test**

Create `src/components/AssistantPage.test.tsx`:

```tsx
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
assert.ok(markup.includes('AI 功能接入后会在这里回复'));
assert.match(markup, /placeholder="和 AI 聊聊今天/);
assert.match(markup, /aria-label="发送消息"/);
assert.match(markup, /disabled/);

console.log('assistant page tests passed');
```

- [ ] **Step 2: Run the focused assistant test and verify the expected red state**

Run:

```bash
pnpm exec tsx src/components/AssistantPage.test.tsx
```

Expected: FAIL because `AssistantPage` does not yet exist.

- [ ] **Step 3: Implement the assistant page UI and local placeholder interaction**

Use `useState`, `FormEvent`, and Lucide icons such as `Sparkles`, `MessageCircle`, and `Send`. Keep the initial assistant message explicit:

```tsx
type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const QUICK_PROMPTS = ['总结今天', '看看我的趋势', '回顾最近情绪'];

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: '先从今天的状态开始聊聊吧。你可以告诉我此刻的心情，或者问问最近的记录。',
  },
];

export const AssistantPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const submitMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
      {
        id: `placeholder-${Date.now()}`,
        role: 'assistant',
        content: 'AI 功能接入后会在这里回复。',
      },
    ]);
    setInput('');
  };
```

Render the page with these structural requirements:

- Root id `assistant-view-pane`, `min-h-full`, and a column layout that leaves room above the fixed bottom navigation.
- Header card with `AI 助手`, the subtitle, and a sage icon container.
- Assistant bubbles aligned left with `bg-[#E6F0E6]` and user bubbles aligned right with `bg-[#8FA88B] text-white`.
- Quick prompt buttons use `rounded-full`, white/gray-50 surfaces, soft borders, and fill the input rather than making a network request.
- Composer uses a `<form>` with a `textarea`, placeholder beginning with `和 AI 聊聊今天`, and a round sage send button. The button is disabled when `input.trim()` is empty.
- Add `aria-live="polite"` to the message list and `aria-label="发送消息"` to the send button.
- Show a small muted status line stating that the AI service has not been connected yet.

Use the existing tokens and patterns: `bg-[#F9F8F6]`, `bg-white`, `border-[#F2EDE9]`, `rounded-3xl`, `rounded-2xl`, `text-[#4A4540]`, `text-gray-400`, and the sage primary action classes. Do not add gradients, dark dashboard panels, or new dependencies.

- [ ] **Step 4: Run the focused assistant test and verify it passes**

Run:

```bash
pnpm exec tsx src/components/AssistantPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the assistant component**

```bash
git add src/components/AssistantPage.tsx src/components/AssistantPage.test.tsx
git commit -m "feat: add local AI assistant chat UI"
```

---

### Task 3: Extract the log history page without changing its behavior

**Files:**

- Create: `src/components/LogHistoryPage.tsx`
- Test: `src/components/LogHistoryPage.test.tsx`

**Interfaces:**

```tsx
export interface LogHistoryPageProps {
  entries: LogEntry[];
  searchQuery: string;
  selectedMoodFilter: number | null;
  onSearchQueryChange: (query: string) => void;
  onMoodFilterChange: (mood: number | null) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}
```

The component owns no record state and does not delete entries directly. It calls `onDelete(entry.id)` and lets `App` show the existing confirmation dialog.

- [ ] **Step 1: Write the failing log-history rendering test**

Create `src/components/LogHistoryPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the focused log-history test and verify the expected red state**

Run:

```bash
pnpm exec tsx src/components/LogHistoryPage.test.tsx
```

Expected: FAIL because `LogHistoryPage` does not yet exist.

- [ ] **Step 3: Extract and adapt the existing log-history rendering**

Move the current `activeTab === 'log'` markup from `src/App.tsx` into `LogHistoryPage`. Preserve these existing behaviors exactly:

- Search matches the lowercase journal string against the lowercase query.
- Mood filtering compares the numeric `moodLevel` with `selectedMoodFilter`.
- Entries remain sorted newest-first by `date`.
- Cards keep the current mood, sleep, activities, and journal display.
- Empty state remains based on `entries.length === 0`.

Move the local display helpers into this component:

```tsx
const getOptionalNumber = (value: unknown) =>
  typeof value === 'number' ? value : null;

const formatScaleValue = (value: number | null) =>
  value === null ? '未记录' : `${value}/10`;
```

Import `LogEntry`, `getActivityOption`, and the existing Lucide icons from their current modules. Add the standard settings-page back button with `ChevronLeft`, `aria-label="返回我的"`, and call `onBack` on click. Keep the page root id `log-history-pane`.

Replace direct App state setters in the extracted JSX with the props:

```tsx
value={searchQuery}
onChange={(event) => onSearchQueryChange(event.target.value)}
onClick={() => onMoodFilterChange(null)}
onClick={() => onMoodFilterChange(score)}
onClick={() => onDelete(entry.id)}
```

- [ ] **Step 4: Run the focused log-history test and verify it passes**

Run:

```bash
pnpm exec tsx src/components/LogHistoryPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the extracted page**

```bash
git add src/components/LogHistoryPage.tsx src/components/LogHistoryPage.test.tsx
git commit -m "refactor: extract log history page"
```

---

### Task 4: Wire App navigation, settings entry, and page rendering

**Files:**

- Modify: `src/App.tsx`
- Test: `src/components/AssistantNavigation.test.ts`
- Modify: `src/components/LocalFontAndTabNames.test.ts`

**Interfaces:**

- `App` imports `AssistantPage` and `LogHistoryPage`.
- `App` imports `isLogHistoryHash` and `logHistoryRoute` from `routes.ts`.
- `App` remains the owner of `logSearchQuery`, `selectedMoodFilter`, `requestDeleteEntry`, and `pendingDelete`.

- [ ] **Step 1: Write the failing App wiring assertions**

Create `src/components/AssistantNavigation.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

assert.match(appSource, /<AssistantPage/);
assert.match(appSource, /<LogHistoryPage/);
assert.match(appSource, /isLogHistoryOpen/);
assert.match(appSource, /logHistoryRoute/);
assert.match(appSource, />AI</);
assert.match(appSource, />日志历史</);
assert.match(appSource, /navigateToLogHistory/);
assert.equal(appSource.includes("activeTab === 'log'"), false);

console.log('assistant navigation tests passed');
```

Update `src/components/LocalFontAndTabNames.test.ts` so the bottom-nav assertions include `/>AI</` and assert that the bottom-nav slice does not contain `>日志</`.

- [ ] **Step 2: Run the source tests and verify the expected red state**

Run:

```bash
pnpm exec tsx src/components/AssistantNavigation.test.ts
pnpm exec tsx src/components/LocalFontAndTabNames.test.ts
```

Expected: FAIL because App still renders the old log tab and does not import the new pages.

- [ ] **Step 3: Add profile sub-page state and route synchronization**

In `src/App.tsx`:

1. Import `AssistantPage`, `LogHistoryPage`, `BookOpen`, `MessageCircle`, `assistantRoute` if needed for labels, `isLogHistoryHash`, and `logHistoryRoute`.
2. Initialize:

```tsx
const [isLogHistoryOpen, setIsLogHistoryOpen] = useState(
  () => isLogHistoryHash(window.location.hash)
);
```

3. In `handleHashChange`, set `setIsLogHistoryOpen(isLogHistoryHash(window.location.hash))` alongside the existing settings flags.
4. In the non-native reminder redirect branch, reset all secondary flags including `setIsLogHistoryOpen(false)`.
5. Expand the secondary-page condition:

```tsx
const isSecondarySettingsOpen =
  isRecordFieldSettingsOpen || isReminderSettingsOpen || isLogHistoryOpen;
```

6. Add:

```tsx
const navigateToLogHistory = () => {
  window.location.hash = logHistoryRoute;
};
```

7. Change the reminder action listener from `getHashForTab('log')` to `getHashForTab('assistant')` so it no longer references the removed tab value while still opening the daily record modal.

- [ ] **Step 4: Replace the old log-tab markup with the assistant page**

Remove the inline `activeTab === 'log'` history block and render:

```tsx
{activeTab === 'assistant' && (
  <PageTransition key="assistant">
    <AssistantPage />
  </PageTransition>
)}
```

Render the extracted page when the profile log-history route is active:

```tsx
{activeTab === 'profile' && isLogHistoryOpen && (
  <PageTransition key="log-history">
    <LogHistoryPage
      entries={entries}
      searchQuery={logSearchQuery}
      selectedMoodFilter={selectedMoodFilter}
      onSearchQueryChange={setLogSearchQuery}
      onMoodFilterChange={setSelectedMoodFilter}
      onDelete={(id) => requestDeleteEntry(id)}
      onBack={() => navigateToTab('profile')}
    />
  </PageTransition>
)}
```

Place this before the existing record-field and reminder settings render blocks.

- [ ] **Step 5: Add the settings entry for log history**

Inside `#profile-settings-group`, add a full-width row that follows the existing row style and calls `navigateToLogHistory`. Use `BookOpen` in a warm terracotta icon tile and these labels:

```tsx
<span>日志历史</span>
<span>查看和搜索过去的记录</span>
```

Use a top divider (`border-t border-[#F2EDE9]`), `min-h-[88px]`, `px-5 py-4`, `rounded` settings-group container, and a right-side `ChevronRight`. Keep the row available on web and native platforms.

- [ ] **Step 6: Rename the bottom-nav entry to AI**

Update the first bottom-nav button:

```tsx
onClick={() => navigateToTab('assistant')}
activeTab === 'assistant'
<MessageCircle size={22} />
<span className="text-[10px] font-bold">AI</span>
```

Preserve the existing active sage color, inactive gray color, transition, spacing, and bottom-nav geometry. Keep the center `+` button unchanged except for any route-independent comments or labels needed to remove the old log-tab wording.

- [ ] **Step 7: Run the App wiring tests and verify they pass**

Run:

```bash
pnpm exec tsx src/components/AssistantNavigation.test.ts
pnpm exec tsx src/components/LocalFontAndTabNames.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the integrated navigation change**

```bash
git add src/App.tsx src/components/AssistantNavigation.test.ts src/components/LocalFontAndTabNames.test.ts
git commit -m "feat: move log history into profile settings"
```

---

### Task 5: Run the complete verification set and perform visual QA

**Files:**

- No source changes expected unless a verification failure identifies a concrete regression.

- [ ] **Step 1: Run all focused feature tests**

Run:

```bash
pnpm exec tsx src/routes.test.ts
pnpm exec tsx src/components/AssistantPage.test.tsx
pnpm exec tsx src/components/LogHistoryPage.test.tsx
pnpm exec tsx src/components/AssistantNavigation.test.ts
pnpm exec tsx src/components/LocalFontAndTabNames.test.ts
```

Expected: every command exits with code 0 and prints its success message.

- [ ] **Step 2: Run the existing local regression tests**

Run:

```bash
pnpm exec tsx src/components/RecordFieldSettingsPage.test.tsx
pnpm exec tsx src/components/ReminderPlatformVisibility.test.ts
pnpm exec tsx src/components/AppLifecycle.test.ts
pnpm exec tsx src/localDataStore.test.ts
pnpm exec tsx src/logEntry.test.ts
pnpm exec tsx src/reportData.test.ts
```

Expected: all existing record, reminder, persistence, and report tests remain green.

- [ ] **Step 3: Run type-checking and production build**

Run:

```bash
pnpm lint
pnpm build
```

Expected: TypeScript reports no errors and Vite produces a successful production build.

- [ ] **Step 4: Inspect the 420px phone shell and narrow layout**

Run the development server:

```bash
pnpm dev --host 0.0.0.0
```

Check manually at the phone-shell width and a narrow mobile width:

- Bottom nav shows `AI`, `趋势`, `日历`, `我的` and the center `+` remains raised.
- AI page header, bubbles, quick prompts, textarea, and send button fit without horizontal overflow.
- Sending text creates a right-aligned user bubble and the honest placeholder reply.
- “我的” contains “日志历史”; opening it hides bottom navigation and shows the extracted history page.
- Back from log history returns to “我的”; old `#/log` opens AI.
- Existing record modal, deletion confirmation, and settings pages still work.

- [ ] **Step 5: Commit any verification-only corrections**

If the focused tests, type-check, build, or visual inspection require a source correction, run the affected focused test again and commit only the correction:

```bash
git add src/App.tsx src/routes.ts src/components/AssistantPage.tsx src/components/LogHistoryPage.tsx
git commit -m "fix: polish AI assistant navigation UI"
```

If no correction is required, do not create an empty commit.

## Completion Criteria

- The bottom-navigation log entry is replaced by a design-system-compliant AI assistant page.
- The original log history is reachable from “我的/日志历史” and retains its existing behavior.
- `#/log` resolves to AI, while `#/profile/log-history` opens history.
- No AI network call or persistence is introduced in this phase.
- All focused tests, existing regression tests, `pnpm lint`, and `pnpm build` pass.
