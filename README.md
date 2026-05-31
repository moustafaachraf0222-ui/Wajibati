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

## Standalone File

`Website.html` is a standalone version that can be opened directly from the desktop without a dev server.

## Current Storage Note

This prototype stores platform data in the browser with `localStorage`. That is fine for testing the interface, but a real shared school platform needs a backend database before multiple devices or users can share the same live data.
