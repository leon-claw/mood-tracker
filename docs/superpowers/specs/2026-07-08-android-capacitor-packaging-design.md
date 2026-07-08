# Android Capacitor Packaging Design

## Goal

Package the Mood Tracker React app as a self-distributed Android APK using Capacitor. The first Android release should feel like the current mobile web app, run locally inside the installed app, and keep the same offline-first data behavior as the web version.

## Approved Direction

- Use Capacitor to package the Vite `dist/` output into an Android WebView-based native app.
- Distribute APKs directly for domestic Android channels or self-hosted downloads.
- Default Android builds are local/offline first and do not require login.
- Cloud account UI is configurable: hidden by default, shown only when an API base URL is provided at build time.
- Add a simple update check that shows a styled prompt and opens the APK download URL in the browser.

## Non-Goals For The First Android Release

- No Google Play-specific release workflow.
- No Trusted Web Activity/PWA wrapper.
- No automatic in-app APK download and install flow.
- No required backend login or cloud sync.
- No rewrite in native Kotlin/Java.

## Architecture

The Android app will use Capacitor as a native shell around the existing React app:

1. `npm run build` creates static web assets in `dist/`.
2. `npx cap sync android` copies the built assets into the Android project.
3. Gradle builds a debug or release APK from the generated `android/` project.
4. The installed app loads local assets in Capacitor's Android WebView.

The app keeps the same hash routes, UI shell, bottom navigation, log modal, charts, local data schema, and JSON import/export format used by the web app.

## Configuration

Add build-time configuration for Android behavior:

- `VITE_ANDROID_APP_VERSION`: current packaged app version, mirrored with native Android version metadata.
- `VITE_ANDROID_UPDATE_URL`: optional URL to a remote JSON version manifest.
- `VITE_API_BASE_URL`: optional API base URL. If absent, account/cloud UI is hidden.

The cloud client should not hardcode `/api` for Android. It should resolve API requests from `VITE_API_BASE_URL` when present, and the app should treat missing API configuration as local-only mode.

## Account And Cloud Sync Behavior

Default Android build:

- Hide login/register/cloud sync controls in the profile page.
- Keep local data management visible.
- Store entries, points, unlocked items, and premium state in WebView `localStorage`.
- Preserve the existing JSON import/export payload shape:
  `{ entries, points, unlockedItems, isPremiumUnlocked }`.

Configured Android build with `VITE_API_BASE_URL`:

- Show the same account/cloud sync controls as the web app.
- Keep the existing "not forced to login" behavior.
- If local data exists at login, keep the existing local-vs-cloud choice flow.

## Android Import And Export

Import should continue to accept JSON backups with the current format. The standard file picker path can be used when supported by the Android WebView.

Export needs Android-specific handling because Blob download behavior can be inconsistent inside WebView. For Android builds:

- Prefer a Capacitor bridge for exporting JSON through a share sheet or file save flow.
- Keep the existing Blob download path for normal web builds.
- Do not change the exported JSON schema.

The first implementation should verify export behavior on Android. If the basic WebView download is not reliable, add Capacitor file/share plugins and route Android export through them.

## Update Check

The Android app checks a remote manifest only when `VITE_ANDROID_UPDATE_URL` is configured.

Example manifest:

```json
{
  "version": "1.0.1",
  "apkUrl": "https://example.com/mood-tracker-1.0.1.apk",
  "notes": "修复导入导出体验"
}
```

On startup:

1. Fetch the manifest.
2. Compare the remote semantic version with the packaged version.
3. If the remote version is newer, show a modal matching the app's current design style.
4. "下载新版" opens `apkUrl` in the system browser.
5. "稍后再说" dismisses the prompt for the current session.

The app will not request APK install permissions in the first release.

## Android App Identity

Use stable Android identity values:

- App name: `Mood Tracker` unless the user later chooses a Chinese display name.
- Package id: `com.moodtracker.app` unless changed before release signing.
- App icon: use the existing simplified tree icon as the source for Android launcher assets.

The release signing keystore must be generated once, stored outside source control, and backed up. Future APK updates for the same package id must be signed compatibly.

## Build Scripts

Add package scripts for repeatable Android work:

- `android:init`: initialize Capacitor and add Android platform.
- `android:sync`: build web assets and sync them into Android.
- `android:open`: open the Android project in Android Studio.
- `android:apk:debug`: build a debug APK.
- `android:apk:release`: build a release APK.

Release signing details can live in local Gradle properties or documented environment variables, not in committed secrets.

## Testing And Acceptance Criteria

Code checks:

- Existing TypeScript tests pass.
- `npm run lint` passes.
- `npm run build` passes.
- `npx cap sync android` completes after the Android project is initialized.

Android behavior:

- APK installs and launches.
- Log, report, calendar, profile, modal animations, and bottom navigation work.
- Default Android build does not show account/cloud controls.
- Build with `VITE_API_BASE_URL` shows account/cloud controls.
- Local records survive app restart.
- JSON import works.
- JSON export works through either WebView download or Capacitor-backed share/file flow.
- Update prompt appears when the remote manifest version is newer.
- Android back button closes modals before leaving the app or navigating away.
- Status bar, safe areas, and bottom navigation do not overlap on common Android screen sizes.

## Risks And Mitigations

- **WebView export downloads may be unreliable.** Mitigate by adding Capacitor file/share handling for Android export if verification shows issues.
- **Keystore loss blocks updates.** Mitigate by documenting keystore generation, storage, and backup before release.
- **Cloud UI could appear without a usable backend.** Mitigate by hiding account controls unless `VITE_API_BASE_URL` is configured.
- **Update manifest unavailable.** Mitigate by failing silently and keeping the app usable offline.
- **Android WebView layout differences.** Mitigate with device/emulator checks for safe areas, bottom navigation, and modal sheets.

## References

- Capacitor Android documentation: https://capacitorjs.com/docs/android
- Android app signing documentation: https://developer.android.com/studio/publish/app-signing
- Android WebView documentation: https://developer.android.com/develop/ui/views/layout/webapps/webview
