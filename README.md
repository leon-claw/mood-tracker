<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Mood Tracker

This contains the Mood Tracker React app, optional Node.js backend, and Capacitor Android shell.

View your app in AI Studio: https://ai.studio/apps/bbcb9884-7843-4856-81d2-dd920f91a8b1

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `pnpm install`
2. Run the web app: `npm run dev`
3. Optional backend: start PostgreSQL with `docker compose up -d`, then run `npm run server:dev`

## Android APK

The Android app is packaged with Capacitor. The default Android build is local/offline first and hides account/cloud controls unless an API base URL is provided at build time.

Optional Android build variables:

- `VITE_ANDROID_APP_VERSION=1.0.0`
- `VITE_ANDROID_UPDATE_URL=https://example.com/latest.json`
- `VITE_API_BASE_URL=https://api.example.com`

Common commands:

```bash
pnpm install
npm run android:sync
npm run android:apk:debug
```

The debug APK is generated under `android/app/build/outputs/apk/debug/`.

For release APKs, create and back up a release keystore outside source control, configure Gradle signing locally, then run:

```bash
npm run android:apk:release
```

Keep the same package id and signing key for future APK updates.
