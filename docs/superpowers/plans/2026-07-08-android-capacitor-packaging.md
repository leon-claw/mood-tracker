# Android Capacitor Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the Mood Tracker web app as a self-distributed Android APK with offline-first behavior, configurable cloud UI, and a lightweight update prompt.

**Architecture:** Add a small frontend Android configuration layer, gate cloud/account UI behind `VITE_API_BASE_URL`, add a reusable update checker and update prompt, then initialize Capacitor Android against the existing Vite `dist/` output. Android export will prefer Capacitor share/write support when available and keep the existing browser Blob fallback for web.

**Tech Stack:** React, Vite, TypeScript, Capacitor, Android Gradle project, existing Tailwind/lucide/motion UI patterns.

---

## File Map

- Create `src/appConfig.ts`: Reads Vite environment variables and exposes app version, update manifest URL, API base URL, Android/native flags, and account visibility.
- Create `src/updateCheck.ts`: Pure update manifest validation and semver comparison helpers.
- Create `src/androidExport.ts`: Export JSON through Capacitor Share/Filesystem when available, otherwise fall back to browser Blob download.
- Create `src/components/UpdatePrompt.tsx`: Styled modal for Android update prompts.
- Modify `src/cloudDataStore.ts`: Accept configurable API base URL and avoid hardcoded `/api`.
- Modify `src/App.tsx`: Gate account/cloud UI, skip session restore without API config, call update checker, use Android-aware export path.
- Modify `vite.config.ts`: Keep dev proxy for web development.
- Modify `package.json`: Add Capacitor dependencies and Android scripts.
- Create `capacitor.config.ts`: Capacitor app id/name/webDir configuration.
- Generate `android/`: Capacitor Android project.
- Create tests:
  - `src/appConfig.test.ts`
  - `src/updateCheck.test.ts`
  - `src/androidExport.test.ts`
  - update `src/dataStores.test.ts`
  - update `src/components/AuthCloudUi.test.ts`

## Task 1: Frontend Runtime Configuration

**Files:**
- Create: `src/appConfig.ts`
- Test: `src/appConfig.test.ts`

- [ ] Write a failing test that imports `createAppConfig` and verifies:
  - Empty env hides account UI.
  - `VITE_API_BASE_URL` enables account UI and trims trailing slashes.
  - `VITE_ANDROID_APP_VERSION` and `VITE_ANDROID_UPDATE_URL` are exposed.

Run: `./node_modules/.bin/tsx src/appConfig.test.ts`
Expected: fail because `src/appConfig.ts` does not exist.

- [ ] Implement:

```ts
interface AppConfig {
  appVersion: string;
  updateManifestUrl: string;
  apiBaseUrl: string;
  isNativeAndroid: boolean;
  showCloudAccount: boolean;
}

const normalizeBaseUrl = (value?: string) => (value || '').trim().replace(/\/+$/, '');

export const createAppConfig = (env: Record<string, string | boolean | undefined>): AppConfig => ({
  appVersion: String(env.VITE_ANDROID_APP_VERSION || env.VITE_APP_VERSION || '0.0.0'),
  updateManifestUrl: String(env.VITE_ANDROID_UPDATE_URL || '').trim(),
  apiBaseUrl: normalizeBaseUrl(typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : ''),
  isNativeAndroid: env.VITE_CAPACITOR_PLATFORM === 'android',
  showCloudAccount: normalizeBaseUrl(typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : '').length > 0,
});

export const appConfig = createAppConfig(import.meta.env);
```

- [ ] Run the test again and confirm it passes.

## Task 2: Configurable Cloud Data Store

**Files:**
- Modify: `src/cloudDataStore.ts`
- Test: `src/dataStores.test.ts`

- [ ] Update the existing data store test so `createCloudDataStore(fetcher, { apiBaseUrl: 'https://api.example.com' })` sends requests to `https://api.example.com/api/...`, while the default keeps `/api/...`.

Run: `./node_modules/.bin/tsx src/dataStores.test.ts`
Expected: fail because `createCloudDataStore` does not accept an options object.

- [ ] Implement a `CloudDataStoreOptions` type with `apiBaseUrl?: string`, add `withApiBase(path)` inside `createCloudDataStore`, and route every request through it.

- [ ] Run `./node_modules/.bin/tsx src/dataStores.test.ts` and confirm it passes.

## Task 3: Cloud UI Feature Gate

**Files:**
- Modify: `src/App.tsx`
- Test: `src/components/AuthCloudUi.test.ts`

- [ ] Update the source test to assert:
  - `appConfig.showCloudAccount` is used.
  - session restore is skipped when cloud account is hidden.
  - the account card only renders when `showCloudAccount` is true.
  - `createCloudDataStore(fetch, { apiBaseUrl: appConfig.apiBaseUrl })` is present.

Run: `./node_modules/.bin/tsx src/components/AuthCloudUi.test.ts`
Expected: fail because `App.tsx` still always renders the account card and uses default cloud store.

- [ ] Modify `App.tsx`:
  - import `appConfig`;
  - initialize `cloudStore` with `appConfig.apiBaseUrl`;
  - add `const showCloudAccount = appConfig.showCloudAccount;`;
  - return early in session restore when `!showCloudAccount`;
  - wrap the account/cloud card and auth dialogs in `showCloudAccount`.

- [ ] Run the source test again and confirm it passes.

## Task 4: Update Manifest Logic

**Files:**
- Create: `src/updateCheck.ts`
- Test: `src/updateCheck.test.ts`

- [ ] Write failing tests for:
  - `isVersionNewer('1.0.1', '1.0.0') === true`;
  - `isVersionNewer('1.0.0', '1.0.1') === false`;
  - `parseUpdateManifest` accepts `{ version, apkUrl, notes }`;
  - invalid manifest objects return `null`.

Run: `./node_modules/.bin/tsx src/updateCheck.test.ts`
Expected: fail because `src/updateCheck.ts` does not exist.

- [ ] Implement `UpdateManifest`, `isVersionNewer`, `parseUpdateManifest`, and `fetchUpdateManifest`.

- [ ] Run the test again and confirm it passes.

## Task 5: Update Prompt UI

**Files:**
- Create: `src/components/UpdatePrompt.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/AuthCloudUi.test.ts`

- [ ] Extend the source test to assert `UpdatePrompt`, `VITE_ANDROID_UPDATE_URL`, `fetchUpdateManifest`, `下载新版`, and `稍后再说`.

Run: `./node_modules/.bin/tsx src/components/AuthCloudUi.test.ts`
Expected: fail because update prompt is not implemented.

- [ ] Implement `UpdatePrompt` using the existing modal/card style.

- [ ] Wire `App.tsx` startup to fetch the manifest only when `appConfig.updateManifestUrl` is configured and show the prompt when the remote version is newer.

- [ ] Run the source test again and confirm it passes.

## Task 6: Android-Aware JSON Export

**Files:**
- Create: `src/androidExport.ts`
- Modify: `src/App.tsx`
- Test: `src/androidExport.test.ts`

- [ ] Write failing tests for:
  - browser fallback creates an object URL and clicks an anchor;
  - when a mock Capacitor share bridge is present, export uses the bridge and avoids the anchor fallback.

Run: `./node_modules/.bin/tsx src/androidExport.test.ts`
Expected: fail because `src/androidExport.ts` does not exist.

- [ ] Implement `exportJsonFile({ json, filename, bridge })` with a browser fallback and optional Capacitor-style bridge.

- [ ] Modify `App.tsx` to call `exportJsonFile` in `handleExportData`.

- [ ] Run the export test and source tests again.

## Task 7: Capacitor Project Setup

**Files:**
- Create: `capacitor.config.ts`
- Modify: `package.json`
- Generate: `android/`

- [ ] Install dependencies:
  `pnpm add @capacitor/core @capacitor/android @capacitor/app @capacitor/browser @capacitor/filesystem @capacitor/share`
  and
  `pnpm add -D @capacitor/cli`

- [ ] Add package scripts:
  - `android:init`
  - `android:sync`
  - `android:open`
  - `android:apk:debug`
  - `android:apk:release`

- [ ] Create `capacitor.config.ts` with app id `com.moodtracker.app`, app name `Mood Tracker`, webDir `dist`, and bundled web runtime disabled.

- [ ] Run `npm run build`.

- [ ] Run `npx cap add android` if `android/` does not exist.

- [ ] Run `npx cap sync android`.

## Task 8: Android Verification And Documentation

**Files:**
- Modify: `README.md`
- Verify: generated Android files.

- [ ] Add a short Android build section to `README.md` with:
  - install dependencies;
  - sync Android assets;
  - debug APK command;
  - release signing note;
  - optional env variables.

- [ ] Run:
  `./node_modules/.bin/tsx src/appConfig.test.ts && ./node_modules/.bin/tsx src/updateCheck.test.ts && ./node_modules/.bin/tsx src/androidExport.test.ts && ./node_modules/.bin/tsx src/dataStores.test.ts && ./node_modules/.bin/tsx src/components/AuthCloudUi.test.ts`

- [ ] Run the existing test chain from the prior plan.

- [ ] Run `npm run lint`.

- [ ] Run `npm run build`.

- [ ] Run `npx cap sync android`.

- [ ] If Android SDK/Gradle is available, run `cd android && ./gradlew assembleDebug`.
