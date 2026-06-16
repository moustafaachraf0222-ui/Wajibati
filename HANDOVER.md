# Wajibati — Project Handover Document

> **Purpose:** Complete context for any AI agent to take over development of the Wajibati school platform. Read this entire file before making changes.

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| **Name** | واجباتي (Wajibati) — school management platform |
| **Live URL** | https://wajibati.pages.dev |
| **Cloudflare dashboard** | https://dash.cloudflare.com → Pages → wajibati |
| **Cloudflare account ID** | `83518ef0308e6d0953fb2e40107ea9b5` |
| **GitHub repo** | https://github.com/moustafaachraf0222-ui/Wajibati |
| **GitHub branch** | `main` (only branch in use) |
| **Repo owner (GitHub)** | `moustafaachraf0222-ui` (Moustafa) |
| **Cloudflare account email** | `moustafaachraf0222@gmail.com` (Moustafa) |
| **Owner of this PC** | `Adil Taibi` (`adiltaibi32@gmail.com`) |
| **Local project path** | `C:\Users\adil\Desktop\Wajibati` |
| **Local prototypes folder** | `C:\Users\adil\Desktop\Wajibati-prototypes` |
| **Locale / language** | Algerian Arabic primary, multi-language (ar / fr / en) |
| **Primary persona** | Moustafa (developer/owner); user base is Algerian students, teachers, directors |
| **Current commit** | `415104c` (Redesign Settings view) — check with `git log -1` |

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19 + TypeScript 5.7 |
| **Build** | Vite 7 |
| **Styling** | Plain CSS (no Tailwind / no CSS-in-JS) — single big `src/styles.css` |
| **Icons** | `lucide-react` (SVG only — **NEVER use emoji as icons**, the user hates this) |
| **State** | React local state + `useState`/`useMemo`/`useCallback` only — no Redux, no Zustand |
| **Persistence** | LocalStorage + Cloudflare D1 (via Pages Functions) |
| **Hosting** | Cloudflare Pages |
| **DB** | Cloudflare D1 (`wajibati-db`, ID `713bdfe5-e4a5-4be7-bad3-9e316e936d4f`) |
| **Functions** | Cloudflare Pages Functions in `functions/api/state.js` |
| **Mobile (companion app)** | Capacitor 8 + Android WebView (`android/` folder — do not touch unless asked) |
| **PDF generation** | In-browser via Canvas (in `overview.tsx`) |
| **QR scanning** | `BarcodeDetector` (native) with `jsqr` fallback |

### Runtime commands (always from `C:\Users\adil\Desktop\Wajibati`)

```powershell
npm install              # one-time
npm run build            # tsc -b && vite build — produces dist/
npm run dev              # vite dev server on 127.0.0.1
npm run android:sync     # rebuild + cap sync android (only for Android changes)
npm run apk:debug        # build debug APK
```

PowerShell — use `;` not `&&`, use `Set-Location` or `workdir` parameter, not `cd &&`.

---

## 3. Project Structure

```
C:\Users\adil\Desktop\Wajibati\
├── src/
│   ├── App.tsx                       # root — wires Login + AppShell + AppRouter
│   ├── app-router.tsx                # switches by view from stack
│   ├── app-shell.tsx                 # sidebar + topbar + back button
│   ├── app-session.ts                # useAppSession() — session, stack, login
│   ├── app-sync.ts                   # useSharedDataSync() — sync to D1
│   ├── app-effects.ts                # misc hooks (language, theme, session)
│   ├── nav-stack.ts                  # NavStack + push/pop/popToRoot (NEW)
│   ├── styles.css                    # 4500+ lines, all CSS in one file
│   ├── types.ts                      # PlatformData, PlatformUser, Exercise, etc.
│   ├── i18n.ts                       # copy[lang][key] translations (ar/fr/en)
│   ├── data.ts                       # main data accessors + scoping
│   ├── data-access.ts                # getSchool(), scopedUsers() etc.
│   ├── data-account-edit.ts          # account edit helpers
│   ├── data-tombstones.ts            # soft delete logic
│   ├── education.ts                  # stage, year, stream, class groups
│   ├── homework.ts                   # exercise stats, completion, week
│   ├── homework-dates.ts             # isPastExercise, groupByMonth
│   ├── homework-difficulty.ts        # difficulty label key
│   ├── homework-stats.ts             # feedbackForStudent, completionStats
│   ├── messages.ts                   # announcement/note expiry logic
│   ├── dates.ts                      # formatDateTime
│   ├── files.ts                      # readAttachmentFromInput
│   ├── ui.tsx                        # shared UI: Field, StatCard, ResponsiveTable
│   ├── ui-account.tsx                # AccountAssignmentDetails, RoleLabel
│   ├── ui-table.tsx                   # ResponsiveTable
│   ├── overview.tsx                  # student/director overview (COMPACT)
│   ├── settings.tsx                  # settings page (COMPACT)
│   ├── exercises.tsx                 # student exercises table (COMPACT)
│   ├── messages.tsx                  # announcements + notes (COMPACT)
│   ├── login.tsx                     # login + student signup (STILL OLD)
│   ├── schools.tsx                   # schools list (STILL OLD)
│   ├── labs.tsx                      # labs management (STILL OLD)
│   ├── canteen.tsx                   # canteen (director/worker, STILL OLD)
│   ├── absences.tsx                  # absences (largest, STILL OLD)
│   ├── accounts.tsx                  # accounts (STILL OLD)
│   ├── accounts-admin.tsx
│   ├── accounts-director.tsx
│   ├── accounts-director-create.tsx
│   ├── accounts-edit.tsx
│   ├── accounts-table.tsx
│   ├── accounts-credentials.tsx
│   └── ...
├── functions/
│   └── api/
│       └── state.js                  # Cloudflare Pages Function: shared state via D1
├── android/                          # Capacitor Android (only touch if asked)
├── wrangler.toml                     # Cloudflare config — D1 binding, pages output
├── wrangler.example.toml             # template
├── package.json                      # scripts, deps
├── tsconfig.json                     # strict TS, jsx: react-jsx
├── vite.config.ts
├── index.html                        # dir="rtl" lang="ar"
├── dist/                             # build output (gitignored)
└── .git/                             # main branch
```

---

## 4. Authentication Setup

### GitHub (SSH)

The PC has an SSH key configured for the `moustafaachraf0222-ui` GitHub account. The private key is at:
- `C:\Users\adil\.ssh\id_ed25519_wajibati` (no passphrase)
- `C:\Users\adil\.ssh\config` has the rule for github.com → uses this key

**Push workflow always works** (the first `git push` may say "Everything up-to-date" if the commit was just made — run it again and it will push). If you need to set up SSH on a new PC, generate a key and ask the user to add the public key at https://github.com/settings/keys.

Git config (already set):
- `user.name = Adil`
- `user.email = adiltaibi32@gmail.com`
- (do NOT change the email — it's tied to the SSH key)

### Cloudflare (wrangler)

The user logged in via Brave browser OAuth. To re-authenticate on a new PC:
```powershell
npx wrangler login
```
This will open a browser tab; the user must click "Allow". After that, `npx wrangler pages deploy` works without further prompts.

Cloudflare account:
- Account name: `moustafaachraf0222@gmail.com's Account`
- Account ID: `83518ef0308e6d0953fb2e40107ea9b5`

### NEVER share

- SSH private key (`C:\Users\adil\.ssh\id_ed25519_wajibati`) — never read or paste
- GitHub PATs — if the user pastes one, use it to update Windows credential manager (under `git:https://github.com`), never write to disk
- Cloudflare API tokens — same, never persist

---

## 5. Build + Deploy Workflow

The standard loop for ANY change:

```powershell
# 1. Edit code
# 2. Build to verify TypeScript
Set-Location "C:\Users\adil\Desktop\Wajibati"
npm run build

# 3. Stage + commit (drop package-lock.json noise from npm)
git add -A
git reset HEAD package-lock.json
git status --short

git commit -m "Short, specific commit message"

# 4. Push to GitHub
git push origin main
# (first push right after a commit may say "Everything up-to-date" — run again, it will push)

# 5. Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name wajibati
# Output ends with: "✨ Deployment complete! Take a peek over at https://<hash>.wajibati.pages.dev"
```

Verify after deploy:
```powershell
git ls-remote origin main                       # should match local HEAD
npx wrangler pages deployment list --project-name wajibati  # latest deployment
```

The live site is `https://wajibati.pages.dev` (CNAME to whatever the latest deployment is).

---

## 6. Design System (CURRENT: Prototype 11 — "Compact")

The user is currently migrating the entire app to the P11 design. The full prototype is at:
`C:\Users\adil\Desktop\Wajibati-prototypes\11-compact.html`

### Core design rules (P11)

- **Sidebar: 220px** (was 264), 32px nav items, 28px brand mark, tight padding
- **Topbar: 48px** (was 56), smaller back button, compact padding
- **No emojis as icons EVER** — use Lucide SVGs (1.8px stroke) for everything
- **Card-based layouts** — not the legacy `.panel` design
- **Compact stat strips** — auto-fit grid of 180px min cards, icon + label + value
- **Table-based lists** with status bar, title+tags, teacher, date, status badge, action
- **Filter tabs** with active state and counts
- **Search bars** in the page header (not topbar)
- **Status pills** (active/expiring/archived; primary/alert variants)
- **Compact forms** with floating labels and tight inputs
- **BEM-style classes** with `ce-` (compact-exercises), `ov-` (overview), `settings-` prefixes
- **Indigo accent on light**: `--accent: #4f46e5` (in settings: `var(--teal-soft)` and `var(--teal)` are still primary)
- **Color tokens** (already defined in `:root`): `--paper`, `--paper-soft`, `--line`, `--ink`, `--muted`, `--teal`, `--teal-soft`, `--bad`, `--bad-soft`, `--warn`, `--ok`

### CSS naming convention

New classes added recently (use these for new work):
- `.ov-overview`, `.ov-page-head`, `.ov-h1`, `.ov-eyebrow`, `.ov-stats`, `.ov-stat`, `.ov-stat.pri`, `.ov-stat.alert`, `.ov-panel`, `.ov-panel-head`, `.ov-detail-list`
- `.compact-exercises`, `.ce-page-head`, `.ce-sub`, `.ce-search`, `.ce-stats`, `.ce-stat`, `.ce-stat.pri`, `.ce-stat.alert`, `.ce-filter-bar`, `.ce-filter-tab`, `.ce-filter-tab.active`, `.ce-filter-spacer`, `.ce-sort`, `.ce-sec-head`, `.ce-table`, `.ce-t-head`, `.ce-t-row`, `.ce-t-row.late`, `.ce-t-row.done`, `.ce-t-row.pri`, `.ce-t-row.warn`, `.ce-t-main`, `.ce-t-cell`, `.ce-teacher`, `.ce-t-action`, `.ce-badge`, `.ce-badge.danger`, `.ce-badge.ok`, `.ce-badge.warn`, `.ce-empty`
- `.message-card`, `.message-card-head`, `.message-card.archived-message-card`, `.message-status`, `.message-status.expiring`, `.message-status.archived`, `.message-meta`, `.mm-tag`
- `.settings-view`, `.settings-page-head`, `.settings-grid`, `.settings-card`, `.settings-card-head`, `.settings-card-icon`, `.settings-card-icon.admin`, `.settings-lang-row`, `.settings-lang-btn`, `.settings-lang-btn.active`, `.settings-theme-toggle`, `.settings-theme-btn`, `.settings-theme-btn.active`, `.settings-form`, `.settings-form-foot`, `.settings-saved`, `.settings-toggles`, `.settings-toggle`, `.settings-card-foot`
- `.back-button` (already existed, made more compact)
- `.topbar` (made more compact)
- `.sidebar` (made more compact)
- `.nav-item` (made more compact)
- `.brand-mark` (made smaller)

### Mobile responsiveness

All new compact classes are designed to work on mobile too via:
- `grid-template-columns: repeat(auto-fit, minmax(...))` for cards
- Media query for tables on small screens: hides some columns, keeps the most important ones
- Form fields collapse to single column on narrow screens

---

## 7. View-by-View Status

| View | File | Status | Notes |
|---|---|---|---|
| Login | `src/views/login.tsx` | 🔴 OLD | needs P11 refresh — high priority |
| App shell | `src/app-shell.tsx` | ✅ P11 | sidebar 220px, topbar 48px, compact nav |
| Settings | `src/views/settings.tsx` | ✅ P11 | card grid + custom toggle |
| Overview | `src/views/overview.tsx` | ✅ P11 | compact stat strip + detail panel |
| Exercises (student) | `src/views/exercises.tsx` | ✅ P11 | table + search + filter + status badges |
| Exercises (teacher) | `src/views/exercises.tsx` | ✅ P11 | year/stream/class grouping + archive |
| Announcements | `src/views/messages.tsx` | ✅ P11 | message cards with status badges |
| Notes (student) | `src/views/messages.tsx` | ✅ P11 | compact card list |
| Notes (teacher) | `src/views/messages.tsx` | ✅ P11 | form + list with badges |
| Schools | `src/views/schools.tsx` | 🔴 OLD | 18KB, needs refresh |
| Labs | `src/views/labs.tsx` | 🔴 OLD | 30KB, needs refresh |
| Canteen | `src/views/canteen.tsx` | 🔴 OLD | 32KB (director + worker only) |
| Absences | `src/views/absences.tsx` | 🔴 OLD | 89KB — the biggest, has separate sub-views for student/director/supervisor |
| Accounts (admin) | `src/views/accounts-admin.tsx` | 🔴 OLD | uses groupBySchool design from earlier work |
| Accounts (director) | `src/views/accounts-director.tsx` | 🔴 OLD | |
| Accounts (table) | `src/views/accounts-table.tsx` | 🔴 OLD | |
| Accounts (edit) | `src/views/accounts-edit.tsx` | 🔴 OLD | |
| Accounts (credentials) | `src/views/accounts-credentials.tsx` | 🔴 OLD | |
| Accounts (director create) | `src/views/accounts-director-create.tsx` | 🔴 OLD | |
| Accounts (main) | `src/views/accounts.tsx` | 🔴 OLD | small wrapper |
| Nav stack | `src/nav-stack.ts` | ✅ NEW | navigation stack used by shell |

**Migration progress: 5 of 13+ views done.**

---

## 8. Navigation Architecture (NEW)

The app now uses a **navigation stack** (added in commit `1ceba98`).

**Files:**
- `src/nav-stack.ts` — exports `NavStackEntry`, `pushEntry`, `popEntry`, `popToRoot`, `replaceTopEntry`, `resetStack`
- `src/app-session.ts` — uses `useState<NavStack>([{ view: 'overview' }])` and exposes `pushView`, `popView`, `popToRootView`, `replaceTopView`, `resetToView`
- `src/app-router.tsx` — reads `topView(stack)` and renders the right view
- `src/app-shell.tsx` — has back button when `canGoBack(stack)` is true, calls `popView` on click

**Stack behavior:**
- Sidebar click → `pushView(view)` (avoids duplicates via `pushEntry`)
- Back button → `popView()`
- On login → `resetToView(defaultView(role))`

**Adding drill-down navigation in the future:**
- Pass an `onPush` callback to a view
- View calls `onPush({ view: 'school-detail', schoolId: '...' })`
- Extend `NavStackEntry` to include params

**Currently**, the stack is only used for top-level view switching. Drill-down within views (e.g., school list → school detail) is not yet implemented.

---

## 9. i18n (3 languages)

All text in the app goes through `tr(language, key)` from `src/i18n.ts`. **NEVER hardcode user-facing text in components.**

```tsx
import { tr } from '../i18n';
{tr(language, 'exercises')}  // 'التمارين' | 'Exercices' | 'Exercises'
```

To add a new key:
1. Find the end of the `ar` section (line 494), `fr` (line 1000), `en` (line 1493)
2. Add the key in the same order to all three
3. The `tr()` function falls back to `copy.ar[key]` then to the key string itself

Common keys (sample):
- `exercises`, `announcements`, `notes`, `absences`, `settings`, `school`, `students`
- `active`, `completed`, `late`, `archived`
- `assignedToYou`, `lateExercises`, `completionRate`
- `searchExercises`, `filterAll`, `filterActive`, `filterCompleted`, `filterLate`, `sortByNewest`
- `back`, `signIn`, `logout`, `darkMode`, `lightMode`
- `search`, `save`, `cancel`, `delete`, `edit`, `create`

Recent additions (P11 work):
- `accountsBySchool`, `platformAdministrators`, `schoolGroupFallback`, `schoolAccountsCount`, `back`
- `searchExercises`, `filterAll`, `filterActive`, `filterCompleted`, `filterLate`, `sortByNewest`
- `totalCount`, `exerciseCount`, `exerciseCountPlural`
- `late`, `review`, `start`, `active`, `teacherName`, `lateExercises`, `assignedToYou`
- `messageStatusActive`, `messageStatusExpiring`, `messageStatusArchived`

---

## 10. Data Model (most important types)

```ts
type Role = 'admin' | 'director' | 'supervisor' | 'lab' | 'canteen' | 'teacher' | 'student';
type Stage = 'primary' | 'middle' | 'secondary';
type Language = 'ar' | 'fr' | 'en';
type Theme = 'light' | 'dark';
type AccountStatus = 'active' | 'disabled';
type View = 'overview' | 'schools' | 'users' | 'school' | 'exercises' | 'announcements' | 'notes' | 'absences' | 'labs' | 'canteen' | 'settings';

type SchoolRecord = {
  id: string; name: string; stage: Stage; domain: string; city: string;
  address: string; phone: string; directorId?: string;
  streams?: SecondaryStream[]; deletedAt?: string;
};

type PlatformUser = {
  id: string; name: string; email: string; password: string;
  role: Role; status: AccountStatus; schoolId?: string; stage?: Stage;
  subject?: Subject; schoolYear?: number; classGroup?: string;
  // ... more fields, see types.ts
};

type PlatformData = {
  schools: SchoolRecord[];
  users: PlatformUser[];
  studentActivations: StudentActivationRecord[];
  exercises: Exercise[];
  announcements: Announcement[];
  notes: TeacherNote[];
  completions: Record<string, string[]>;           // userId → exerciseId[]
  feedback: Record<string, Record<string, HomeworkFeedback>>;  // userId → exerciseId → feedback
  absenceSchedules: AbsenceSchedule[];
  absenceRecords: AbsenceRecord[];
  absenceReports: AbsenceReport[];
  laboratories: Laboratory[];
  labDevices: LabDevice[];
  labFaultReports: LabFaultReport[];
  labReservationRequests: LabReservationRequest[];
  canteenCards: CanteenCard[];
  canteenMealScans: CanteenMealScan[];
  pushTokens: Record<string, PushTokenRecord[]>;
  deletedSchoolIds: string[];
  deletedExerciseIds: string[];
  deletedNoteIds: string[];
  deletedScheduleIds: string[];
  settings: { allowExerciseImages: boolean; maintenanceMode: boolean };
};
```

**Key data functions** (in `src/data.ts` and `src/data-access.ts`):
- `getSchool(data, user)` → user's school
- `scopedUsers(data, user)` → users visible to this user
- `scopedExercises(data, user)` → exercises visible to this user
- `scopedAnnouncements`, `scopedNotes` → similar
- `scopedLabsForUser(data, user)` → labs visible
- `userCanSeeSchool(user, school)` → permission check
- `canAuthenticateUser(data, user)` → user is active and school is not trashed
- `makeId(prefix)` → e.g., `makeId('exercise')` → `exercise-1700000000-abc`
- `trashSchoolRecords`, `restoreSchoolRecords`, `deleteSchoolRecords` → soft/hard delete

---

## 11. Recent Commits (working state)

```
415104c Redesign Settings view with compact card layout
3c677d1 Refresh messages/announcements/notes cards with status badges
fef0d5d Apply compact design to OverviewView (student home)
f5c492a Apply Prototype 11 (Compact) to student exercises view
1ceba98 Add navigation stack for screen-based navigation
ff92a44 feat(prototype) - nav-stack + work + compact sidebar/topbar  
2c01b51 fix(prototype) - better contrast for topbar in dark mode
b85bf48 feat(prototype) - back button to topbar
d6c5d88 feat(prototype) - improved nav-stack with view-store
0347ed8 feat(prototype) - added view store to localstorage
```

(These last few "feat(prototype)" are from the previous AI agent — they may not all be on main. The actual current commit on main is the one `git log -1` shows.)

---

## 12. Conventions (must follow)

### Icons
- ALWAYS use Lucide React. Examples: `BookOpen`, `AlertCircle`, `CheckCircle2`, `User`, `Plus`
- **NEVER use emoji as icons** (no 📚, 📢, etc.) — the user explicitly said this is bad
- If you need a custom icon, use inline SVG
- Stroke width: 1.8 for default, 2.4 for emphasized, 2.2 for status indicators
- Default size: 16px in inline elements, 18-20px in cards, 14px in compact tables

### Text
- All user-facing text in 3 languages via `tr(language, key)`
- Numbers: `font-variant-numeric: tabular-nums` for alignment
- Bold for important values, regular for labels
- Don't use `font-weight: 950` or `1000` — use 700-800 for "very bold"

### Spacing
- 4px grid (4, 8, 12, 16, 24, 32)
- Component padding: 10-20px
- Section gap: 14-24px
- Card gap: 8-12px
- Inline gap: 4-8px

### CSS
- All CSS in `src/styles.css`
- Use BEM-like naming for new classes (`ce-stat`, `ov-panel`, etc.)
- Don't add new CSS files — keep it consolidated
- Use logical properties: `padding-inline-start`, `inset-inline-start`, `border-inline-end`
- RTL support is built in via `dir="rtl"` on `<html>`

### Components
- Use `useState` for local state
- Use `useMemo` for expensive derivations
- Avoid `useEffect` unless absolutely needed
- Components are NOT in separate files unless they're large
- View files (`src/views/*.tsx`) typically have 1-4 sub-components inline

### Naming
- `NavStack` for navigation entries
- `PlatformData` for the app data
- `PlatformUser` for users
- `CommonViewProps` for shared view props `{ data, currentUser, language }`
- Tr functions: `tr(language, 'key')`
- Boolean helpers: `isX`, `hasX`, `canX`

---

## 13. Common Tasks

### Add a new view
1. Create `src/views/myview.tsx` with `export function MyViewView({ data, currentUser, language, ...props }: ...)`
2. Add the view name to `View` type in `src/types.ts`
3. Add the view to `src/navigation.ts` navItems for each role
4. Add the case to `src/app-router.tsx`
5. Add i18n keys for all 3 languages
6. Add styles to `src/styles.css`

### Add an i18n key
1. Find the end of the `ar` section in `src/i18n.ts` (line 494)
2. Find the end of the `fr` section (line 1000)
3. Find the end of the `en` section (line 1493)
4. Add the key in the same order to all three languages
5. Use it: `{tr(language, 'yourKey')}`

### Add a CSS class for a new design component
1. Open `src/styles.css` — find a logical place (e.g., at the end of a related section, or after a section comment)
2. Use BEM-like naming
3. Add a comment block if it's a new design system component
4. Test RTL by checking `dir="rtl"` rules if needed

### Refresh a view to P11 design
1. Look at `C:\Users\adil\Desktop\Wajibati-prototypes\11-compact.html` for the design reference
2. Find the corresponding view file in `src/views/`
3. Refactor the JSX to use the new class names (`ov-*`, `ce-*`, `settings-*`, `mm-tag`, `message-card`, etc.)
4. Add new CSS classes to `src/styles.css` if needed
5. Add new i18n keys if needed
6. Build, commit, push, deploy

### Fix a bug
1. Reproduce the bug if possible
2. Check the relevant file
3. Use `Select-String` or `grep` to find usages
4. Make a focused fix
5. Build to verify TypeScript
6. Commit, push, deploy

### Add a feature (e.g., new field on Exercise)
1. Update the `Exercise` type in `src/types.ts`
2. Update the form in `src/views/exercises.tsx`
3. Update the display (table or card) in the same file
4. Update any related components
5. Update the i18n keys
6. Build, commit, push, deploy

---

## 14. Common pitfalls

- **Don't** hardcode user-facing text — always use `tr(language, key)`
- **Don't** use emoji as icons — the user said "they just look so bad"
- **Don't** create new CSS files — add to `src/styles.css`
- **Don't** add new dependencies without user approval
- **Don't** run `git push --force` without explicit user consent
- **Don't** use `&&` in PowerShell — use `;` or `if ($?) { ... }`
- **Don't** run `cd X && cmd` — use `workdir` parameter instead
- **Don't** commit `package-lock.json` if only npm version formatting changed (check with `git diff --stat` first)
- **Don't** run `wrangler login` without checking first — usually the auth is still valid

### First-push issue

If you commit and then `git push origin main` says "Everything up-to-date" even though the commit is new, run `git push origin main` AGAIN. It's a quirk of the SSH/credential setup that happens sometimes.

---

## 15. Things still TODO (the user wants the WHOLE site on P11 design)

The user explicitly said: "11-compact.html اريد الموقع كله على هاذا الشكل تاكد" (I want the whole site to look like 11-compact.html, confirm)

Views that still need P11 refresh (in order of priority):
1. **Login page** (`src/views/login.tsx`) — 22KB, first impression, highest impact
2. **Schools view** (`src/views/schools.tsx`) — 18KB
3. **Labs view** (`src/views/labs.tsx`) — 30KB
4. **Canteen view** (`src/views/canteen.tsx`) — 32KB
5. **Absences view** (`src/views/absences.tsx`) — 89KB (largest, has student/director/supervisor sub-views)
6. **Accounts views** (multiple files, ~80KB total) — admin and director account management

For each, the approach is:
- Look at the prototype reference (`C:\Users\adil\Desktop\Wajibati-prototypes\11-compact.html`)
- Refactor the JSX to use compact design classes
- Add new CSS if needed (to `src/styles.css`)
- Add new i18n keys
- Build → commit → push → deploy

---

## 16. Emergency contacts

- The user is Moustafa. He's the owner of the project, GitHub account, and Cloudflare account.
- He speaks Arabic and English. Default to Arabic for user-facing content.
- He's patient with design changes but wants clean, organized, professional work.
- He will tell you "continue" / "استمر" / "اكمل" to keep going. He will give specific tasks otherwise.
- If the user gives a screenshot, address what they SHOW — the visual quality is the main concern.
- "تاكد" means "verify / make sure" — usually wants you to double-check your work or ensure consistency.

---

## 17. Quick commands cheat sheet

```powershell
# Open the prototypes folder in File Explorer
explorer "C:\Users\adil\Desktop\Wajibati-prototypes"

# Open the project in VS Code
code "C:\Users\adil\Desktop\Wajibati"

# View the live site
start "https://wajibati.pages.dev"

# Check the design prototype
start "C:\Users\adil\Desktop\Wajibati-prototypes\11-compact.html"

# Full deployment cycle
Set-Location "C:\Users\adil\Desktop\Wajibati"
npm run build
git add -A
git reset HEAD package-lock.json
git status --short
git commit -m "Description"
git push origin main
npx wrangler pages deploy dist --project-name wajibati
```

---

**End of handover document.**

When the next AI takes over, they should:
1. Read this entire file
2. Open `C:\Users\adil\Desktop\Wajibati-prototypes\11-compact.html` in a browser
3. Run `cd "C:\Users\adil\Desktop\Wajibati" && npm install` (if needed)
4. Run `git log --oneline -10` to see the recent state
5. Continue applying P11 design to the views listed in Section 15
6. Each change: build → commit → push → deploy
