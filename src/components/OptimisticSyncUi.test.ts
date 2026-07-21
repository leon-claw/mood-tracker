import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const calendarSource = readFileSync(new URL('./CalendarMonthView.tsx', import.meta.url), 'utf8');
const syncFeedbackSource = readFileSync(new URL('./SyncFeedback.tsx', import.meta.url), 'utf8');

assert.match(appSource, /setEntries\(nextEntries\)/);
assert.match(appSource, /CLOUD_SYNC_BATCH_DELAY_MS = 10_000/);
assert.match(appSource, /cloudBatchTimerRef/);
assert.match(appSource, /cloudBatchTimerRef\.current !== null/);
assert.match(appSource, /pendingCloudChangesRef/);
assert.match(appSource, /cloudStore\.applyChanges\(batch\)/);
assert.match(appSource, /cloudStore\.getBootstrap\(\)/);
assert.match(appSource, /cloudStore\.getEntriesByMonth/);
assert.match(appSource, /cloudStore\.getEntryMonths\(\)/);
assert.match(appSource, /cloudStore\.getYearlyReport/);
assert.equal(appSource.includes('cloudStore.getData()'), false);
assert.equal(appSource.includes('cloudStore.upsertEntry'), false);
assert.equal(appSource.includes('cloudStore.updatePreferences'), false);
assert.equal(appSource.includes('CloudLoadingOverlay'), false);
assert.equal(appSource.includes('isInitialCloudLoading'), false);
assert.equal((appSource.match(/SyncStatusIcon isSyncing=\{isCloudSyncing\}/g) || []).length, 2);
assert.match(appSource, /isSyncing=\{isCloudSyncing\}/);

assert.match(calendarSource, /SyncStatusIcon isSyncing=\{isSyncing\}/);
assert.match(syncFeedbackSource, /animate-spin/);
assert.match(syncFeedbackSource, /AnimatePresence/);
assert.match(syncFeedbackSource, /aria-live="polite"/);

console.log('optimistic sync UI tests passed');
