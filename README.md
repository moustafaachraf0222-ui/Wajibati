# Wajibati

School platform prototype built with React, TypeScript, and Vite.

## Local Development

```powershell
npm install
npm run dev
```

## Production Build

```powershell
npm run build
```

The production files are generated in:

```text
dist
```

## Cloudflare Pages

Use these settings when creating the Cloudflare Pages project:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Production branch: main
```

Cloudflare will rebuild and redeploy the website automatically whenever new changes are pushed to the `main` branch.

## Shared Cloudflare Data

The deployed website uses a Cloudflare Pages Function at:

```text
/api/state
```

That function stores platform data in a Cloudflare D1 database. Create a D1 database in Cloudflare, then bind it to the Pages project with this exact variable name:

```text
DB
```

Dashboard path:

```text
Workers & Pages -> your Pages project -> Settings -> Bindings -> Add binding -> D1 database
```

After adding the binding, redeploy the Pages project. The function creates its `app_state` table automatically on the first request.

If the binding is missing, the app falls back to local browser storage and accounts will not appear on other devices.

## Standalone File

`Website.html` is a standalone version that can be opened directly from the desktop without a dev server.

## Android APK

The Android project is configured as a live WebView shell for `https://wajibati.pages.dev`.
After installing the APK, normal website updates appear in the app after the site is redeployed, without rebuilding the APK each time. The APK requires an internet connection.
The live APK uses package id `dz.wajibati.live` and disables the WebView cache on launch so it does not keep an old bundled website view.

## Push Notifications

The Android app uses Firebase Cloud Messaging. Keep these files out of Git:

- `android/app/google-services.json`
- `firebase-service-account.json`

To let Cloudflare send notifications, save the Firebase service account JSON as a Pages secret named `FIREBASE_SERVICE_ACCOUNT`.
The app sends notifications for new teacher exercises, teacher notes, and school announcements.

## Current Storage Note

`localStorage` is now only used as a local fallback/cache. The online shared data source is Cloudflare D1.
