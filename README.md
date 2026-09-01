# Journal

A fast incident journal for managers. Log what a reportee did — a win, a note, a
concern — in a few taps while it is still fresh, then use the accumulated record
for 1:1s and reviews.

Built with Expo (React Native) so the same codebase runs on **web, iOS and
Android**, backed by Supabase (Postgres + Auth + Storage).

## What it does

- **Capture** — one screen, no navigation: pick a person, tap a sentiment, tap an
  impact score, tap any number of themes, type the note, save. Time defaults to *now* with
  one-tap backdating (1h / 3h / yesterday) for when you get to it later. Optional
  photo attachment.
- **Offline-first writes** — a capture lands in local storage and on screen
  immediately, then syncs. If the network is down the entry queues and flushes
  when the app next has connectivity or comes back to the foreground. Nothing is
  lost, and entry never blocks on a request.
- **Timeline** — every entry grouped by day, searchable, filterable by person and
  sentiment.
- **Insights** — sentiment split, average impact, a 12-week trend, recurring
  themes, and a per-person breakdown. Flags reportees you have logged nothing
  about in three weeks, which is usually a gap in your notes rather than in their
  work.
- **1:1 prep** — per person, everything not yet discussed, formatted as plain-text
  talking points you can copy into your notes. Logging the 1:1 as held marks
  those entries discussed so the next prep starts clean.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com), then:

1. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. This creates the tables, row-level security policies, the private
   `incident-photos` storage bucket, and seeds a starter set of themes for each
   new account.
2. Under **Project Settings → API**, copy the project URL and the `anon` public key.

> Already ran `schema.sql` before themes became multi-select? Run
> [`supabase/migrations/001_multi_theme.sql`](supabase/migrations/001_multi_theme.sql)
> once — it adds the `themes` array, carries your existing single theme across,
> and drops the old column. A fresh `schema.sql` run already has the new shape.

Every table is protected by row-level security scoped to `auth.uid()`, so an
account can only ever read and write its own rows. The `anon` key is designed to
ship in a client; the `service_role` key must never go in this project.

### 3. Configure the app

```bash
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

> Expo inlines `EXPO_PUBLIC_*` values at build time and Metro caches the result.
> After editing `.env`, restart with `npx expo start -c` (or export with
> `--clear`), otherwise the old values stay baked in.

### 4. Run

```bash
npm run web       # browser
npm run ios       # iOS simulator / Expo Go
npm run android   # Android emulator / Expo Go
```

Create an account on first launch with email + password. If your Supabase project
has email confirmation enabled (the default), confirm the address before signing
in — or turn confirmation off under **Authentication → Providers → Email** while
you are the only user.

Then add your reportees on the **Team** tab. Capture needs at least one person.

## Shipping to devices

The photo picker and haptics work in Expo Go, so day-to-day use needs no native
build. For a standalone app:

```bash
npx eas build --platform ios       # or android
npx expo export --platform web     # static site in dist/, deploy anywhere
```

Bundle identifiers are set in `app.json` (`com.gurunave.incidentjournal`); change
them before publishing to a store.

## Project layout

```
app/                    Expo Router routes
  _layout.tsx           providers, auth gate, stack
  sign-in.tsx           email + password auth
  (tabs)/index.tsx      Capture — the fast-entry screen
  (tabs)/timeline.tsx   searchable history
  (tabs)/insights.tsx   analytics
  (tabs)/team.tsx       reportees, themes, account, sync status
  incident/[id].tsx     view / edit / delete one entry
  reportee/[id].tsx     per-person history and 1:1 prep
src/
  lib/                  supabase client, types, analytics, photos, cache, theme
  components/           pickers, charts, incident row, UI primitives
  state/                auth provider, data store with the offline outbox
supabase/schema.sql     tables, RLS policies, storage bucket, triggers
supabase/migrations/    deltas for a database created before a schema change
```

## Data model

| Table         | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `reportees`   | Your team. Archivable rather than deletable, so history is kept. |
| `categories`  | The theme catalogue offered as one-tap chips. New themes can be added inline while capturing. |
| `incidents`   | One captured observation: who, when, sentiment, impact 1–5, themes (a `text[]`, so an entry can carry several), note, optional photo. |
| `one_on_ones` | Checkpoints. Marks everything logged so far as discussed.       |

Photos live in the private `incident-photos` bucket at
`<user-id>/<incident-id>.<ext>`; the leading folder is what the storage policies
check, and the app reads them back through short-lived signed URLs.

## Verification status

`npm run typecheck` passes, and the app bundles for web, iOS and Android
(`expo export`). All screens were rendered in a browser against a stubbed
Supabase client with no console errors. End-to-end behaviour against a live
Supabase project has not been exercised — that needs your credentials.
