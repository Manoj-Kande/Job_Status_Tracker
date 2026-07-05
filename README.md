# TrackHire — Job Application Tracker

A multi-user job application tracker built as a single full-stack Next.js app —
track applications, follow-ups, resumes, and useful links in one place.

## Stack
Next.js 16 (App Router, Turbopack) · TypeScript (strict) · Tailwind v4 · Clerk auth ·
Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL (Neon) · React Hook Form + Zod · Recharts.

## Features

### Applications
- Kanban and list views, per-application detail page with tabs (Overview, Timeline, Resume used).
- Quick Add with a collapsible **"Add more details (optional)"** section (priority, location,
  work mode, deadline, salary, notes) — collapsed by default so the fast path stays fast.
- Archive / unarchive from the same row menu; dedicated **Archived** list at `/applications/archived`.
- "Saved for later" jobs kept separate from active applications.

### Follow-ups
- Bucketed by due date, plus an **"All"** tab showing every pending follow-up in one flat list.

### Resumes
- Resume Library: upload, edit, and delete resume versions (already fully wired — pencil/trash
  icons on each card).
- **Resume ↔ job linking**: a `resumeVersionId` relation on `JobApplication` → `ResumeVersion`
  (old free-text field kept as a fallback). The Application tab has a "Resume used" dropdown
  pulling from your library, with an "Open" link to the file. Resume Library cards show every
  application that used that resume, clickable through to the job.
  - Requires a migration: `npx prisma migrate dev` after pulling this.

### Vault
- A personal, foldered link library at `/vault` — save any URL (e.g. a job posting) into a
  folder tree.
- Schema: `VaultFolder` (self-referencing, `onDelete: Cascade` on `parentId`), `VaultLink`,
  and `VaultLinkFolder` as a many-to-many join (denormalized `userId` so batched loads never
  need an extra join).
- Quick-add-with-path (e.g. `linkedin/java/threading`) resolves/creates the whole folder chain
  and attaches the link in one `prisma.$transaction` — atomic, no half-created paths on failure.
- Cycle-safe folder moves: checked client-side against the cached tree for instant feedback,
  and re-checked server-side against freshly-fetched rows inside the same transaction as the move.
- Move is implemented as a **"Move to..." picker dialog**, not literal drag-and-drop, by
  deliberate choice — the transactional/cycle-check correctness was prioritized over pixel-level
  DnD. Real HTML5 drag-and-drop can be layered on top later if wanted.
- Job rows have a **"Save URL to Vault"** action in their menu (when a posting URL exists).
- Requires a migration for the new tables.

### Capture (in progress)
- A `/capture` route (outside the main app's sidebar layout) intended for a browser bookmarklet:
  opens a popup with the current page's URL/title pre-filled, lets you file it straight into
  either an application (via `quickAddJob`) or the Vault (via `quickAddVaultLink`) without
  duplicating existing actions.
- Auth-gated via Clerk, preserving the capture URL through the sign-in redirect.
- Best-effort server-side Open Graph tag fetch (strict `AbortController` timeout, ~3s) to
  suggest a better title when the page didn't supply one — never blocks or throws.
- Status: functional pieces built incrementally; verify the full capture → save flow end-to-end
  before relying on it.

### Performance
- Removed a `QueryClientProvider` (`@tanstack/react-query`) that wrapped the entire app in the
  root layout despite zero components using `useQuery`/`useMutation` — was dead client JS on
  every page load.
- Pruned three unused dependencies: `react-query`, `framer-motion`, `cmdk`.
- Added `optimizePackageImports` for `recharts`, `lucide-react`, and `date-fns`.
- Renamed `middleware.ts` → `proxy.ts` (Next.js 16's current convention; `clerkMiddleware()`
  code itself is unchanged, per Clerk's docs).
- Analytics charts are dynamically imported (`next/dynamic`, `ssr: false`) to keep them out of
  the initial bundle.
- Partial Prerendering (PPR) deliberately **not** adopted — every page here is ~100% per-user
  data, so there's no static shell worth prerendering.

### Database resilience
- Neon's free-tier compute auto-suspends when idle; the first query after that has to wait for
  it to wake up. Fixed in `src/lib/prisma.ts` / `src/lib/auth.ts`:
  - Raised the connection timeout to 15s.
  - Added a retry (up to 3 attempts, backing off) specifically for Prisma's `P1001`
    ("can't reach database server") error, wrapped around `getCurrentUser` — the first DB touch
    on nearly every page/action.
- The `pg` SSL deprecation warning (`'prefer'`/`'require'`/`'verify-ca'` are aliases for
  `'verify-full'`) comes from the connection string itself. Fix: append `sslmode=verify-full`
  explicitly instead of Neon's default `sslmode=require` — documented in `.env.example`.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values, see below
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → add endpoint `https://<your-domain>/api/webhooks/clerk` subscribed to `user.created`, `user.updated`, `user.deleted` |
| `DATABASE_URL`, `DIRECT_URL` | Neon dashboard (pooled + direct connection strings). Append `sslmode=verify-full` explicitly (see note above). For local dev without Neon, run `docker compose up -d` and use `postgresql://jobtracker:jobtracker@localhost:5432/jobtracker` for both. |

### Database
Schema lives in `prisma/schema.prisma`. After changing it, or after pulling the Resume-linking
or Vault features for the first time: `npx prisma migrate dev`.

**Prisma 7 note:** connection URLs no longer live in `schema.prisma` — the CLI reads them from
`prisma.config.ts` (uses `DIRECT_URL`, a non-pooled connection, for migrations), while the app's
runtime client (`src/lib/prisma.ts`) connects via the `@prisma/adapter-pg` driver adapter using
`DATABASE_URL` (Neon's pooled connection string). Make sure both are set in `.env.local`.

### Tests
```bash
npm run test
```
Currently covers the pure business-rule helpers in `src/lib/stale.ts` (auto-follow-up suggestion,
staleness detection). Add integration tests around Server Actions with a test database as the
app grows.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the environment variables above in Project Settings → Environment Variables.
4. Set the Clerk webhook endpoint to your production URL once deployed.
5. Vercel runs `prisma generate` automatically via the `postinstall` script — confirm it's
   present in `package.json`:
   ```json
   "postinstall": "prisma generate"
   ```
6. Deploy. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (e.g. via a
   one-off Vercel CLI command or a CI step) before first use — this includes the Vault and
   Resume-linking tables if you haven't migrated them yet.

## Notes on this build
- Business rules (auto follow-up suggestions, staleness, duplicate detection) live in
  `src/lib/` and `src/actions/`, kept framework-agnostic so they're easy to test.
- Every Prisma query is scoped to the Clerk-authenticated user (`src/lib/auth.ts`) — no user ID
  is ever trusted from the client.
- Kanban view updates status without drag-and-drop (a select per card); the Vault's folder
  "move" is likewise a picker dialog rather than pixel-level drag-and-drop, both by deliberate
  choice (see above). Real drag-and-drop can be added later with `@dnd-kit` if desired.
- Known sandbox limitation during development: builds were verified with `next build`'s
  TypeScript/lint checks, but Prisma Client generation (and therefore a live-DB check) requires
  network access to Prisma's engine binaries that isn't available in the dev sandbox — always
  re-verify against your real Neon instance after pulling a change.
