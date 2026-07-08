import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const logModalSource = readFileSync(new URL('./LogModal.tsx', import.meta.url), 'utf8');
const pageTransitionSource = readFileSync(new URL('./PageTransition.tsx', import.meta.url), 'utf8');
const confirmDialogSource = readFileSync(new URL('./ConfirmDialog.tsx', import.meta.url), 'utf8');

assert.match(logModalSource, /entry\?: LogEntry/);
assert.match(logModalSource, /<RecordForm/);
assert.match(appSource, /todayEntry/);
assert.match(appSource, /calendarEditorEntry/);
assert.match(appSource, /<LogModal[\s\S]*initialDate=\{calendarEditorDate \|\| undefined\}/);
assert.match(appSource, /<LogModal[\s\S]*entry=\{calendarEditorEntry \|\| todayEntry\}/);
assert.match(appSource, /onSelectDate=\{\(date\) => \{[\s\S]*setCalendarEditorDate\(date\);[\s\S]*setIsLogModalOpen\(true\);[\s\S]*\}\}/);
assert.equal(appSource.includes('<RecordEditorPage'), false);

assert.equal(appSource.includes('window.confirm'), false);
assert.match(confirmDialogSource, /role="dialog"/);
assert.match(confirmDialogSource, /确认删除/);
assert.match(confirmDialogSource, /rose-/);
assert.match(appSource, /<ConfirmDialog/);

assert.match(pageTransitionSource, /disableInitialAnimation/);
assert.match(appSource, /disableInitialAnimation/);

assert.match(logModalSource, /AnimatePresence/);
assert.match(logModalSource, /motion\.div/);
assert.match(logModalSource, /initial=\{\{ opacity: 0 \}\}/);
assert.match(logModalSource, /exit=\{\{ opacity: 0 \}\}/);
assert.match(logModalSource, /initial=\{\{ y: '100%'/);
assert.match(logModalSource, /exit=\{\{ y: '100%'/);

console.log('record sync and dialog tests passed');
