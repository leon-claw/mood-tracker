# Device Auto Data Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in, structured Android device data modules for steps, once-daily weather, and screen time, integrated with the existing record-field settings and cloud/local data flows.

**Architecture:** Extend the existing record model with an optional structured `autoData` object and add three read-only automatic field definitions controlled by the existing `enabledRecordFieldIds` preference. Use a custom Capacitor Android plugin plus WorkManager: native collectors write pending snapshots to a native queue, and the foreground WebView drains that queue into local storage and the existing sync path.

**Tech Stack:** React 19, TypeScript, Vite, Capacitor 8, Android Java/Kotlin bridge, AndroidX WorkManager, Health Connect, Android SensorManager, UsageStatsManager, Open-Meteo, Prisma/PostgreSQL, Node `assert` tests executed with `tsx`.

## Global Constraints

- Automatic fields are opt-in: disabled fields are hidden, not collected, and do not request their permissions or call their APIs.
- New automatic fields default to disabled for new and existing users.
- `enabledRecordFieldIds` remains the only field/module toggle; do not add a parallel automatic-collection toggle.
- `autoData` is structured data; display strings are derived by formatter functions and are never the source of truth.
- Weather uses Open-Meteo; location is temporary input only and is never displayed or persisted.
- Weather succeeds at most once per local calendar date; steps and screen time update the current date through scheduled background runs.
- Android background work must tolerate inexact execution and vendor battery restrictions; foreground resume is a fallback drain/retry point.
- Web builds must not call Android-only collectors.
- Preserve the user's unrelated untracked `.vscode/` files and stage only files belonging to this feature.

---

### Task 1: Add the typed automatic data model and validation helpers

**Files:**
- Create: `src/autoData.ts`
- Modify: `src/types.ts`
- Modify: `src/logEntry.ts`
- Test: `src/autoData.test.ts`
- Test: `src/logEntry.test.ts`

**Interfaces:**
- Produces `AutoData`, `AutoStepsData`, `AutoWeatherData`, `AutoScreenTimeData`, `AutoModuleId`, `isAutoData`, `sanitizeAutoData`, `mergeAutoData`, and `formatAutoDataDate`.
- `LogEntry` gains `autoData?: AutoData`.

- [ ] **Step 1: Write failing validation tests**

```ts
import assert from 'node:assert/strict';
import { mergeAutoData, sanitizeAutoData } from './autoData';

const sanitized = sanitizeAutoData({
  steps: { count: '4321', source: 'step-sensor', collectedAt: '2026-08-07T10:00:00Z', isFinal: false },
  weather: { weatherCode: 1, temperatureC: 28, provider: 'open-meteo', collectedAt: '2026-08-07T10:00:00Z' },
  screenTime: { minutes: 120, collectedAt: '2026-08-07T10:00:00Z', isFinal: false },
});

assert.equal(sanitized.steps?.count, 4321);
assert.equal(sanitized.weather?.provider, 'open-meteo');
assert.equal(sanitized.screenTime?.minutes, 120);
assert.deepEqual(mergeAutoData({ steps: sanitized.steps }, { weather: sanitized.weather }), {
  steps: sanitized.steps,
  weather: sanitized.weather,
});
console.log('auto data tests passed');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec tsx src/autoData.test.ts`

Expected: FAIL because `src/autoData.ts` and the new `LogEntry.autoData` property do not exist.

- [ ] **Step 3: Implement the minimal typed model and sanitizer**

Implement the interfaces from the design spec. Sanitize finite non-negative numeric values, accept only the declared sources/providers, require ISO timestamps, clamp humidity to `0..100`, and return `undefined` for malformed module payloads. Make `mergeAutoData` replace only modules present in the incoming partial object.

- [ ] **Step 4: Run focused tests and existing log-entry tests**

Run: `pnpm exec tsx src/autoData.test.ts`

Run: `pnpm exec tsx src/logEntry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the model change**

```bash
git add src/autoData.ts src/autoData.test.ts src/types.ts src/logEntry.ts src/logEntry.test.ts
git commit -m "feat: add structured automatic record data"
```

### Task 2: Add automatic fields to the existing record-field catalog

**Files:**
- Modify: `shared/appPreferences.ts`
- Modify: `src/types.ts`
- Modify: `src/fieldSchema.ts`
- Modify: `src/components/RecordFieldSettingsPage.tsx`
- Modify: `src/components/RecordFieldSettingsPage.test.tsx`
- Test: `shared/appPreferences.test.ts`

**Interfaces:**
- Produces `AutomaticFieldDefinition` and the field IDs `autoSteps`, `autoWeather`, and `autoScreenTime`.
- `FIELD_DEFINITIONS` and `RECORD_FIELD_IDS` stay in the same order and remain aligned.
- `normalizeAppPreferences` preserves requested automatic IDs but excludes them from the default enabled list.

- [ ] **Step 1: Add failing preference and catalog assertions**

```ts
import assert from 'node:assert/strict';
import { createDefaultAppPreferences, normalizeAppPreferences } from './appPreferences';
import { FIELD_DEFINITIONS } from '../src/fieldSchema';

const defaults = createDefaultAppPreferences();
assert.equal(defaults.enabledRecordFieldIds.includes('autoSteps'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoWeather'), false);
assert.equal(defaults.enabledRecordFieldIds.includes('autoScreenTime'), false);
assert.deepEqual(
  FIELD_DEFINITIONS.map((field) => field.id),
  [...new Set([...defaults.enabledRecordFieldIds, 'autoSteps', 'autoWeather', 'autoScreenTime'])]
);
assert.equal(normalizeAppPreferences({ enabledRecordFieldIds: ['autoWeather'] }).enabledRecordFieldIds.includes('autoWeather'), true);
console.log('automatic preference tests passed');
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm exec tsx shared/appPreferences.test.ts`

Run: `pnpm exec tsx src/components/RecordFieldSettingsPage.test.tsx`

Expected: FAIL because the new IDs, type, definitions, and default handling are missing.

- [ ] **Step 3: Implement the automatic field definitions and defaults**

Add `automatic` to `FieldType`, add `AutomaticFieldDefinition`, extend `RecordFieldId`, and add a `DEFAULT_ENABLED_RECORD_FIELD_IDS` containing only the pre-existing manual fields. Make legacy preference payloads keep their requested IDs but never implicitly enable new automatic IDs.

- [ ] **Step 4: Render the new “设备数据” group as read-only-capable fields**

Add the three fields to `FIELD_DEFINITIONS`, add icons and Chinese labels, and add a `设备数据` group to `RecordFieldSettingsPage`. Show `自动采集 · 只读` as the description for automatic fields. Update the explanatory copy to say that disabling a field stops future collection while retaining history.

- [ ] **Step 5: Run tests and verify the settings catalog**

Run: `pnpm exec tsx shared/appPreferences.test.ts`

Run: `pnpm exec tsx src/components/RecordFieldSettingsPage.test.tsx`

Expected: PASS with the three new fields included in the catalog and disabled by default.

- [ ] **Step 6: Commit the field configuration change**

```bash
git add shared/appPreferences.ts shared/appPreferences.test.ts src/types.ts src/fieldSchema.ts src/components/RecordFieldSettingsPage.tsx src/components/RecordFieldSettingsPage.test.tsx
git commit -m "feat: add opt-in automatic record fields"
```

### Task 3: Add read-only automatic field rendering and formatters

**Files:**
- Create: `src/autoDataFormatters.ts`
- Test: `src/autoDataFormatters.test.ts`
- Modify: `src/components/RecordForm.tsx`
- Modify: `src/components/RecordFormTemplate.test.tsx`
- Modify: `src/components/LogModal.tsx`

**Interfaces:**
- Produces `formatSteps`, `formatWeather`, `formatScreenTime`, and `formatAutomaticField`.
- Record form accepts the current `LogEntry.autoData` and renders automatic fields without adding them to editable form state.

- [ ] **Step 1: Write failing formatter and markup tests**

```ts
import assert from 'node:assert/strict';
import { formatAutomaticField } from './autoDataFormatters';

assert.equal(formatAutomaticField('steps', { count: 6432, source: 'health-connect', collectedAt: '2026-08-07T10:00:00Z', isFinal: false }), '6,432 步');
assert.equal(formatAutomaticField('weather', { weatherCode: 0, temperatureC: 28, provider: 'open-meteo', collectedAt: '2026-08-07T10:00:00Z' }), '晴 · 28°C');
assert.equal(formatAutomaticField('screenTime', { minutes: 252, collectedAt: '2026-08-07T10:00:00Z', isFinal: false }), '4小时12分钟');
console.log('automatic formatter tests passed');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec tsx src/autoDataFormatters.test.ts`

Expected: FAIL because the formatters do not exist.

- [ ] **Step 3: Implement pure formatters**

Format only known weather codes, show `--` for missing optional values, use `font-mono` in the component for exact values, and never include coordinates in weather text.

- [ ] **Step 4: Render automatic fields without editable controls**

Add an automatic-field branch to `RecordForm` that reads from `entry.autoData`, shows the formatted value or “尚未采集”, and excludes automatic fields from the payload passed to `onSave`. Preserve manual field validation and the existing modal layout.

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec tsx src/autoDataFormatters.test.ts`

Run: `pnpm exec tsx src/components/RecordFormTemplate.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the read-only field rendering**

```bash
git add src/autoDataFormatters.ts src/autoDataFormatters.test.ts src/components/RecordForm.tsx src/components/RecordFormTemplate.test.tsx src/components/LogModal.tsx
git commit -m "feat: render automatic fields as read-only values"
```

### Task 4: Persist and sync structured autoData locally, remotely, and in JSON

**Files:**
- Modify: `src/dataPortability.ts`
- Modify: `src/dataPortability.test.ts`
- Modify: `src/localDataStore.ts`
- Modify: `src/cloudDataStore.ts`
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260807000000_add_auto_data/migration.sql`
- Modify: `server/src/domain/portableData.ts`
- Modify: `server/src/domain/logValues.ts`
- Modify: `server/src/repositories/types.ts`
- Modify: `server/src/repositories/prismaRepository.ts`
- Modify: `server/src/repositories/memoryRepository.ts`
- Modify: `server/src/routes/api.ts`
- Test: `server/src/domain/portableData.test.ts`
- Test: `server/src/routes/apiRoutes.test.ts`

**Interfaces:**
- `LogEntry.autoData?: AutoData` is preserved through all local/cloud/import/export paths.
- Server upsert accepts `autoData?: AutoData` and returns it on month/bootstrap/sync reads.

- [ ] **Step 1: Write failing round-trip tests**

```ts
const data = normalizeAppData({
  entries: [{
    id: 'not-a-uuid',
    date: '2026-08-07',
    values: {},
    autoData: { steps: { count: 1000, source: 'health-connect', collectedAt: '2026-08-07T10:00:00Z', isFinal: false } },
  }],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: {},
});
assert.equal(data.entries[0].autoData?.steps?.count, 1000);
assert.equal(normalizeEntries(JSON.parse(createExportJson(data)).data.entries)[0].autoData?.steps?.count, 1000);
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `pnpm exec tsx src/dataPortability.test.ts`

Run: `pnpm exec tsx server/src/domain/portableData.test.ts`

Expected: FAIL because autoData is currently discarded by normalization and absent from server types.

- [ ] **Step 3: Add client and server autoData normalization**

Use `sanitizeAutoData` in both client and server normalization. Reject malformed nested values without rejecting the entire entry. Preserve missing autoData as `undefined`.

- [ ] **Step 4: Add the Prisma JSON column and migration**

Add nullable `autoData Json?` to `LogEntry`, generate the migration SQL with the project’s Prisma conventions, and update repository interfaces and implementations to read/write the column.

- [ ] **Step 5: Extend cloud change payloads and merge behavior**

Allow upsert changes to carry partial `autoData`, merge it with existing autoData, and preserve manual values. Auto-only upserts must not increment manual points.

- [ ] **Step 6: Run local/server tests**

Run: `pnpm exec tsx src/dataPortability.test.ts`

Run: `pnpm exec tsx server/src/domain/portableData.test.ts`

Run: `pnpm exec tsx server/src/routes/apiRoutes.test.ts`

Expected: PASS with old JSON fixtures still valid.

- [ ] **Step 7: Commit persistence and sync support**

```bash
git add src/dataPortability.ts src/dataPortability.test.ts src/localDataStore.ts src/cloudDataStore.ts server/prisma/schema.prisma server/prisma/migrations/20260807000000_add_auto_data/migration.sql server/src/domain/portableData.ts server/src/domain/logValues.ts server/src/repositories server/src/routes/api.ts server/src/domain/portableData.test.ts server/src/routes/apiRoutes.test.ts
git commit -m "feat: persist automatic device data"
```

### Task 5: Add the Capacitor bridge and native permission state

**Files:**
- Create: `src/autoDataBridge.ts`
- Create: `src/autoDataBridge.test.ts`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/AutoDataPlugin.java`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/AutoDataPermissionState.java`
- Modify: `android/app/src/main/java/com/moodtracker/app/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/build.gradle`
- Modify: `android/settings.gradle`

**Interfaces:**
- JS methods: `configure({ enabledModules })`, `getPermissionState()`, `requestModulePermission({ module })`, `drainPending()`, `getSchedulerState()`.
- Native plugin reads the same enabled module IDs and never schedules or requests disabled modules.

- [ ] **Step 1: Write failing JS bridge tests**

```ts
import assert from 'node:assert/strict';
import { getEnabledAutoModules, shouldCollectModule } from './autoDataBridge';

assert.deepEqual(getEnabledAutoModules(['moodLevel', 'autoWeather', 'autoSteps']), ['autoWeather', 'autoSteps']);
assert.equal(shouldCollectModule('autoWeather', ['autoWeather']), true);
assert.equal(shouldCollectModule('autoSteps', ['autoWeather']), false);
console.log('auto data bridge tests passed');
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm exec tsx src/autoDataBridge.test.ts`

Expected: FAIL because the bridge module does not exist.

- [ ] **Step 3: Implement the JS Capacitor proxy with web-safe fallbacks**

Return `unsupported` on Web, filter only the three automatic field IDs, and expose typed results to the orchestrator. Do not request Android permissions from a browser build.

- [ ] **Step 4: Register the native plugin**

Register `AutoDataPlugin` from `MainActivity`. Add only the manifest permissions required by the enabled capabilities, including activity recognition, location, background location, usage stats, and Health Connect declarations. Keep permission requests runtime/special-access based rather than assuming manifest declarations are grants.

- [ ] **Step 5: Implement permission-state methods**

Return independent states for steps, weather, and screen time. A missing state must not make unrelated modules unavailable. Add intents for Health Connect permission management, location settings, and usage-access settings.

- [ ] **Step 6: Run bridge tests and compile Android sources**

Run: `pnpm exec tsx src/autoDataBridge.test.ts`

Run: `cd android; .\gradlew.bat compileDebugJavaWithJavac --no-daemon`

Expected: PASS and a successful Android Java compilation.

- [ ] **Step 7: Commit the bridge and permission layer**

```bash
git add src/autoDataBridge.ts src/autoDataBridge.test.ts android/app/src/main/java/com/moodtracker/app/autodata android/app/src/main/java/com/moodtracker/app/MainActivity.java android/app/src/main/AndroidManifest.xml android/app/build.gradle android/settings.gradle
git commit -m "feat: add native auto data bridge"
```

### Task 6: Implement native collectors and the scheduled queue

**Files:**
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/AutoDataWorker.java`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/AutoDataQueue.java`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/StepsCollector.java`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/ScreenTimeCollector.java`
- Create: `android/app/src/main/java/com/moodtracker/app/autodata/WeatherCollector.java`
- Create: `android/app/src/test/java/com/moodtracker/app/autodata/AutoDataQueueTest.java`
- Create: `android/app/src/test/java/com/moodtracker/app/autodata/WeatherResponseParserTest.java`
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- `AutoDataWorker` reads the enabled-module set from native preferences and writes one dated partial snapshot to `AutoDataQueue`.
- `StepsCollector.collect(date)` returns a typed step snapshot, using Health Connect first and `SensorManager.TYPE_STEP_COUNTER` fallback.
- `ScreenTimeCollector.collect(date)` returns total minutes from `UsageStatsManager`.
- `WeatherCollector.collect(date)` obtains temporary coarse location, calls Open-Meteo once per date, parses only weather data, and discards coordinates.

- [ ] **Step 1: Write native queue and parser tests**

```java
@Test
public void queueMergesDifferentModulesForOneDate() {
  AutoDataQueue queue = new AutoDataQueue(fakePreferences);
  queue.merge("2026-08-07", "steps", "{\"count\":1000}");
  queue.merge("2026-08-07", "weather", "{\"weatherCode\":0}");
  assertThat(queue.read("2026-08-07"), containsString("steps"));
  assertThat(queue.read("2026-08-07"), containsString("weather"));
}
```

- [ ] **Step 2: Run Android unit tests and verify they fail**

Run: `cd android; .\gradlew.bat testDebugUnitTest --tests com.moodtracker.app.autodata.AutoDataQueueTest --tests com.moodtracker.app.autodata.WeatherResponseParserTest --no-daemon`

Expected: FAIL because the queue, parser, and collectors do not exist.

- [ ] **Step 3: Add WorkManager and Health Connect dependencies**

Use the AndroidX WorkManager and Health Connect versions compatible with the project’s compile SDK. Keep the worker’s execution bounded and use network availability as a constraint only for the weather branch.

- [ ] **Step 4: Implement the native queue**

Store pending snapshots in app-private `SharedPreferences`, keyed by local date. Merge module payloads without overwriting other modules, cap the queue to a bounded number of dates, and expose an atomic drain-and-clear operation to the Capacitor plugin.

- [ ] **Step 5: Implement steps collection**

Use Health Connect daily aggregation when permissions and provider are available. If it is unavailable or denied, use the device step counter and a reboot-safe baseline stored in native preferences. Return the source and `isFinal` flag with every snapshot.

- [ ] **Step 6: Implement screen-time collection**

Use `UsageStatsManager` for the local calendar-day interval. Return total foreground usage minutes, not per-app data in this iteration. If usage access is missing, return `permission-required` without writing a fake value.

- [ ] **Step 7: Implement once-daily weather collection**

Before requesting location or making a network call, check that `autoWeather` is enabled and that the queue has no successful weather result for the local date. Obtain coarse location, call Open-Meteo with current weather parameters, parse weather code/temperature/humidity/precipitation, and never enqueue latitude or longitude.

- [ ] **Step 8: Schedule and reschedule the worker**

Use a 60-minute periodic WorkManager request as the initial cadence. Cancel the unique work when no automatic module is enabled; otherwise enqueue it after configuration changes, app launch, boot, and permission-state changes. The worker itself must re-check module enablement before every collector call.

- [ ] **Step 9: Run native tests and compile**

Run: `cd android; .\gradlew.bat testDebugUnitTest --no-daemon`

Run: `cd android; .\gradlew.bat assembleDebug --no-daemon`

Expected: PASS and a debug APK is produced.

- [ ] **Step 10: Commit native collectors and scheduling**

```bash
git add android/app/src/main/java/com/moodtracker/app/autodata android/app/src/test/java/com/moodtracker/app/autodata android/app/build.gradle android/app/src/main/AndroidManifest.xml
git commit -m "feat: collect device data in scheduled Android work"
```

### Task 7: Connect settings, lifecycle, queue drain, and record persistence

**Files:**
- Create: `src/autoDataService.ts`
- Create: `src/autoDataService.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/localDataStore.ts`
- Modify: `src/cloudDataStore.ts`
- Modify: `src/components/RecordFieldSettingsPage.tsx`
- Modify: `src/components/RecordFieldSettingsPage.test.tsx`
- Modify: `src/components/AppLifecycle.test.tsx`

**Interfaces:**
- `syncAutoDataConfiguration(enabledFieldIds)` sends the three automatic IDs to native only on Android.
- `drainAndMergePendingAutoData()` merges queued dates into local records and queues cloud upserts.
- `collectForegroundFallback(date)` handles permission retry and missing background runs without collecting disabled modules.

- [ ] **Step 1: Write failing service tests**

```ts
import assert from 'node:assert/strict';
import { getModulesToCollect, mergePendingAutoDataIntoEntries } from './autoDataService';

assert.deepEqual(getModulesToCollect(['autoSteps', 'autoWeather']), ['steps', 'weather']);
assert.deepEqual(getModulesToCollect(['moodLevel']), []);
const entries = mergePendingAutoDataIntoEntries([], [{ date: '2026-08-07', autoData: { steps: { count: 1000, source: 'health-connect', collectedAt: '2026-08-07T10:00:00Z', isFinal: false } } }]);
assert.equal(entries[0].autoData?.steps?.count, 1000);
console.log('auto data service tests passed');
```

- [ ] **Step 2: Run the service test and verify it fails**

Run: `pnpm exec tsx src/autoDataService.test.ts`

Expected: FAIL because the orchestration module does not exist.

- [ ] **Step 3: Implement configuration synchronization**

When `handleToggleRecordField` changes `enabledRecordFieldIds`, persist preferences first, then send the filtered automatic IDs to the native bridge. A disabled module must be removed from the native schedule immediately.

- [ ] **Step 4: Implement queue draining and date merging**

Drain native pending snapshots on app startup and on native `appStateChange` activation. Merge by date and module, preserve manual `values`, create an auto-only entry when needed, and avoid awarding manual points for automatic-only creation. Queue one cloud upsert per changed date.

- [ ] **Step 5: Add foreground fallback and error state**

When a module is enabled but unavailable, retain the enabled setting, show a concise permission/error status in the read-only field, and retry on the next activation. Never call a module that is not enabled.

- [ ] **Step 6: Run focused and existing lifecycle tests**

Run: `pnpm exec tsx src/autoDataService.test.ts`

Run: `pnpm exec tsx src/components/AppLifecycle.test.tsx`

Run: `pnpm exec tsx src/components/RecordFieldSettingsPage.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit orchestration and lifecycle integration**

```bash
git add src/autoDataService.ts src/autoDataService.test.ts src/App.tsx src/localDataStore.ts src/cloudDataStore.ts src/components/RecordFieldSettingsPage.tsx src/components/RecordFieldSettingsPage.test.tsx src/components/AppLifecycle.test.tsx
git commit -m "feat: sync automatic modules with record settings"
```

### Task 8: Add Android-device verification and regression coverage

**Files:**
- Create: `android/app/src/androidTest/java/com/moodtracker/app/autodata/AutoDataPluginInstrumentedTest.java`
- Modify: `src/components/RecordSyncAndDialog.test.ts`
- Modify: `src/dataStores.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add regression tests for manual/automatic merge behavior**

Assert that automatic-only records do not award manual points, manual saves preserve autoData, disabled modules are not sent to the native bridge, and legacy export JSON without autoData still imports successfully.

- [ ] **Step 2: Run the full TypeScript test and lint suite**

Run: `pnpm exec tsx src/dataStores.test.ts`

Run: `pnpm exec tsx src/components/RecordSyncAndDialog.test.ts`

Run: `pnpm lint`

Expected: PASS.

- [ ] **Step 3: Build and install the debug APK to the connected vivo device**

Run: `pnpm run android:apk:debug`

Run: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

Expected: install succeeds without clearing app data.

- [ ] **Step 4: Verify disabled-module behavior with ADB**

Run: `adb shell dumpsys package com.moodtracker.app | Select-String 'ACTIVITY_RECOGNITION|ACCESS_COARSE_LOCATION|ACCESS_BACKGROUND_LOCATION|PACKAGE_USAGE_STATS'`

Run: `adb logcat -c`

Open the app with all three automatic fields disabled and run: `adb logcat -d -s MoodTrackerAutoData:D *:S`

Expected: no collector or Open-Meteo request is logged.

- [ ] **Step 5: Verify one enabled module at a time**

Enable only one field in “记录模块设置”, grant only its permission, reopen the app, and inspect the read-only field plus native logs. Repeat for steps, weather, and screen time. Confirm that unrelated permissions and collectors remain inactive.

- [ ] **Step 6: Verify persistence and cloud/export behavior**

Export JSON after a successful collection, inspect that `autoData` is structured and contains no coordinates, import it into a clean local profile, and verify the three formatted fields. If cloud mode is configured, verify an upsert round trip through the server test API.

- [ ] **Step 7: Run final verification**

Run: `pnpm lint`

Run: `pnpm build`

Run: `pnpm server:test`

Run: `cd android; .\gradlew.bat testDebugUnitTest assembleDebug --no-daemon`

Expected: all commands pass and the debug APK is generated.

- [ ] **Step 8: Commit verification and documentation**

```bash
git add android/app/src/androidTest src/components/RecordSyncAndDialog.test.ts src/dataStores.test.ts README.md
git commit -m "test: verify automatic device data modules"
```

## Self-review checklist

- [ ] All three modules are represented in `FIELD_DEFINITIONS`, `RECORD_FIELD_IDS`, the shared preference normalizer, the read-only form renderer, the native configuration bridge, the worker, and export/sync paths.
- [ ] Automatic fields default to disabled and disabled modules cause no permission request, sensor read, location read, UsageStats read, or Open-Meteo call.
- [ ] Weather stores no latitude or longitude.
- [ ] `autoData` remains structured through local storage, cloud sync, Prisma JSON, and JSON portability.
- [ ] The plan contains no task that relies on an undefined function, field ID, or type from another task.
- [ ] The user’s existing `.vscode/` changes are never staged.
