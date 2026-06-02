# Wajibati Project Recovery Notes

Last checked: 2026-06-02

## Local Project

- Project folder: `C:\Users\PC\Desktop\New project`
- Main source file: `src\App.tsx`
- Standalone website file: `Website.html`
- Cloudflare Function: `functions\api\state.js`

## GitHub

- Repository: `https://github.com/moustafaachraf0222-ui/Wajibati`
- Git remote name: `origin`
- Git branch: `main`
- Last known commit: `835272d Allow teachers to delete notes`

To restore the remote if it changes by mistake:

```powershell
git remote set-url origin https://github.com/moustafaachraf0222-ui/Wajibati.git
git checkout main
git pull origin main
```

To check that the project is connected correctly:

```powershell
git remote -v
git branch --show-current
git status --short
```

Expected remote:

```text
origin  https://github.com/moustafaachraf0222-ui/Wajibati.git (fetch)
origin  https://github.com/moustafaachraf0222-ui/Wajibati.git (push)
```

## Cloudflare

- Live website: `https://wajibati.pages.dev/`
- Cloudflare Pages project name: `wajibati`
- Shared API endpoint: `https://wajibati.pages.dev/api/state`

Deploy command:

```powershell
npm run build
npx wrangler pages deploy dist --project-name wajibati --branch main --commit-dirty=true
```

Quick production checks:

```powershell
Invoke-RestMethod -Uri "https://wajibati.pages.dev/api/state?meta=1"
```

## Important Secret Files

Do not commit these files:

- `android/app/google-services.json`
- `firebase-service-account.json`

The Cloudflare Firebase secret was stored in Cloudflare Pages as `FIREBASE_SERVICE_ACCOUNT`. Keep it in Cloudflare, not in GitHub.

## Safety Notes

- Before uploading another project, run `pwd` and `git remote -v` to make sure you are in the correct folder.
- Do not run `git remote set-url origin ...` inside this project unless you are restoring the Wajibati remote above.
- If GitHub authentication switches accounts, the project remote can stay the same; only the login token may need to be changed in Git Credential Manager.
