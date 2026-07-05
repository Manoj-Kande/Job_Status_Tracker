# TrackHire — Job Application Tracker

A premium, multi-user job application tracker built as a single full-stack Next.js app.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · Clerk auth · Prisma · PostgreSQL (Neon) · TanStack Query · React Hook Form + Zod · Recharts.

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
| `DATABASE_URL`, `DIRECT_URL` | Neon dashboard (pooled + direct connection strings). For local dev without Neon, run `docker compose up -d` and use `postgresql://jobtracker:jobtracker@localhost:5432/jobtracker` for both. |

### Database
Schema lives in `prisma/schema.prisma`. After changing it: `npx prisma migrate dev`.

**Prisma 7 note:** connection URLs no longer live in `schema.prisma` — the CLI reads them from `prisma.config.ts` (uses `DIRECT_URL`, a non-pooled connection, for migrations), while the app's runtime client (`src/lib/prisma.ts`) connects via the `@prisma/adapter-pg` driver adapter using `DATABASE_URL` (Neon's pooled connection string). Make sure both are set in `.env.local`.

### Tests
```bash
npm run test
```
Currently covers the pure business-rule helpers in `src/lib/stale.ts` (auto-follow-up suggestion, staleness detection). Add integration tests around Server Actions with a test database as the app grows.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the environment variables above in Project Settings → Environment Variables.
4. Set the Clerk webhook endpoint to your production URL once deployed.
5. Vercel runs `prisma generate` automatically via the `postinstall` script — add one if it's missing:
   ```json
   "postinstall": "prisma generate"
   ```
6. Deploy. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (e.g. via a one-off Vercel CLI command or a CI step) before first use.

## Notes on this build
- Business rules (auto follow-up suggestions, staleness, duplicate detection) live in `src/lib/` and `src/actions/`, kept framework-agnostic so they're easy to test.
- Every Prisma query is scoped to the Clerk-authenticated user (`src/lib/auth.ts`) — no user ID is ever trusted from the client.
- Kanban view updates status without drag-and-drop (a select per card); drag-and-drop can be added later with `@dnd-kit` if desired.
- Analytics charts are dynamically imported (`next/dynamic`, `ssr: false`) so recharts doesn't bloat the initial bundle.
