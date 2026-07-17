-- Optional performance migration: speeds up the case-insensitive substring
-- searches used by getJobs() (companyName/jobTitle) and searchVaultLinks()
-- (url/title), which currently can't use a normal B-tree index because they
-- use `contains` + `mode: "insensitive"` (ILIKE '%term%').
--
-- Not included as a numbered Prisma migration because this export has no
-- existing prisma/migrations history to safely append to — running
-- `prisma migrate dev` against a fresh baseline could conflict with your
-- real migration history. Instead, run this file directly once against
-- your database, or fold it into your own next migration:
--
--   psql "$DIRECT_URL" -f prisma/manual-sql/add-search-trigram-indexes.sql
--
-- Safe to run multiple times (IF NOT EXISTS everywhere). Purely additive —
-- doesn't change or drop anything, so no data risk.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "JobApplication_companyName_trgm_idx"
  ON "JobApplication" USING gin ("companyName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "JobApplication_jobTitle_trgm_idx"
  ON "JobApplication" USING gin ("jobTitle" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "VaultLink_url_trgm_idx"
  ON "VaultLink" USING gin ("url" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "VaultLink_title_trgm_idx"
  ON "VaultLink" USING gin ("title" gin_trgm_ops);
