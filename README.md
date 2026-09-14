# Who Said It?

A live team-building game. Participants submit funny or surprising facts in advance. During the meeting, one anonymous fact appears on a large screen, everyone votes from their phone, and the facilitator reveals the author plus the group’s guesses.

This repository is a working Next.js application with Supabase (Postgres, Auth, Realtime), not a UI mock.

## Main features

- Prep mode: join with a game code or link and submit one or more facts (no account)
- Facilitator admin: create games, moderate facts, control rounds, adjust scores
- Presenter view: dark, large-type projector screen with QR join
- Mobile play: vote in real time, one vote per round, changeable until voting closes
- Reveal: author, vote bars, fun message based on actual counts, optional confetti
- Scoring and leaderboard with tied ranks
- Optional voting timer (server expiry, not client-only)
- Optional spin wheel of unused facts (numbered labels only)
- CSV export of results
- Row Level Security so unpublished authors are not readable on public APIs

## Architecture

| Layer | Role |
| --- | --- |
| Next.js App Router | Pages, middleware, server actions |
| `lib/services/*` | Game rules, scoring, timers (unit-tested) |
| `lib/services/game-engine.ts` | Authoritative mutations via the **service role** on the server |
| Supabase Postgres | Source of truth, RLS, unique vote constraint |
| Supabase Auth | Facilitators only |
| Supabase Realtime | Clients subscribe to the `games` row (public-safe denormalized fields) |
| Participant `client_token` | Stored in `localStorage` so refresh does not create a duplicate player |

**Author hiding:** `facts` has **no anonymous SELECT policy**. Players never query `facts` or `rounds.fact_id`. The live fact text is copied onto `games.current_fact_text`. `games.revealed_author_name` and `results_payload` are only filled at reveal. `hideAuthorUntilReveal` also strips those fields from the public payload if a row is read too early.

Sensitive writes (votes, reveals, scores) run in server actions. `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Technology stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn-style UI primitives · Supabase · Framer Motion · `qrcode` · Vitest · ESLint · Prettier · Vercel

## Local setup

1. Node.js 20+
2. Create a [Supabase](https://supabase.com) project
3. Copy `.env.example` to `.env.local` and fill in values (see below)
4. Run the migration, then optionally the seed
5. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | RLS-limited key |
| `NEXT_PUBLIC_APP_URL` | Browser + server | Canonical origin for QR / invite links |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses RLS for validated game actions |

Never prefix the service role key with `NEXT_PUBLIC_`.

## Supabase setup

1. Authentication → enable Email provider. For local testing you can disable “Confirm email”.
2. SQL → run `supabase/migrations/001_init.sql`
3. Database → Replication: `games` is added to `supabase_realtime` by the migration
4. Create a facilitator: sign up at `/admin/login`, or Authentication → Add user
5. Optional fictional demo: run `supabase/seed.sql` after at least one facilitator exists. It creates game code `000001` with Maya, Daniel, Alex, Noor, and Sam. **All seed content is fictional.**

### Row Level Security

RLS is enabled on every table. Facilitators manage only their own games. Anonymous clients can read `games` (public presentation fields) and live participant **names**, not fact authors. `rate_limits`, `facts`, `rounds`, and `votes` are not publicly readable.

## Database migration instructions

- Dashboard: paste `supabase/migrations/001_init.sql` into the SQL editor and run it
- CLI: `supabase db push` from a linked project

Re-run is written to be mostly idempotent (`if not exists` / `drop policy if exists`).

## Seed-data instructions

```sql
-- After a facilitator user exists:
-- SQL editor → run supabase/seed.sql
```

If no facilitator row exists, the script logs a notice and exits.

## Test commands

```bash
npm test
npm run lint
```

Coverage includes scoring, status transitions, vote rules, timer math, public author hiding, schema validation, and an end-to-end **rules** walkthrough (collect → vote → reveal → unused facts). Live HTTP tests require your Supabase project.

## Deployment (Vercel + Supabase)

1. Push this repo and import it in Vercel
2. Set **all four** environment variables in Vercel (Production + Preview). The three
   `NEXT_PUBLIC_*` ones are also needed at build time, so add them before deploying and
   redeploy after any change — missing values make every server action fail
3. `NEXT_PUBLIC_APP_URL` must be the deployed HTTPS origin, not `localhost`
4. Apply the SQL migration on the production Supabase project
5. Enable Realtime on `public.games` if the migration’s publication block did not run
6. Create a facilitator account on production
7. Deploy. Vercel uses `next build`

### Post-deployment checklist

- [ ] `/admin/login` sign-in works
- [ ] Create a game, copy PREP link, submit a fact without an account
- [ ] Approve the fact, open presenter + phone play
- [ ] Start a round: phones show the fact **without** an author
- [ ] Vote, close, reveal: author and bars match the votes
- [ ] Refresh the phone: same player, same round
- [ ] Network tab: `/api/public-state` has no author before reveal
- [ ] End game shows the leaderboard

## Design decisions (MVP)

- One denormalized `games` row is the realtime document for players (simplest secure sync)
- Default scoring: 1 point for a correct guess, optional +1 if `response_time_ms <= 8000`
- The author never earns a guessing point on their own fact
- Timer close is enforced when state is fetched (`isExpired` on the server), not only in the browser
- shadcn/ui is implemented as local primitives (`components/ui`) rather than the full CLI catalog

## Game instructions for facilitators

1. Sign in → **New game** → open **Collecting facts** and share the PREP QR or link
2. Review facts → approve (edit or add manually if needed)
3. On a laptop open **Control room**; on the projector open **Presenter**
4. Players scan the presenter QR (`/play`)
5. Start / next fact → open voting → close → reveal → repeat
6. End game for the final leaderboard; export CSV from Results

Shortcuts on the control screen: Space reveal, ← → facts, R random, V voting, L leaderboard, P pause, F fullscreen. They are ignored while typing in an input.

## Participant instructions

- Prep: open the invite link, enter a display name, submit a fact. You can submit more than one.
- Play: scan the QR, confirm your name, wait for a round, pick who said it, submit. You may change your vote until voting closes.

## Security notes

- Public participants are not Auth users
- Display names only; no extra PII
- Duplicate votes are blocked by `unique (round_id, voting_participant_id)`
- Fact submission is rate-limited per `client_token`
- Facilitators can delete an entire game
- Do not expose service role or database passwords in client bundles

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `fetch failed` on sign-in / any server action, locally | Corporate TLS inspection. Node rejects the intercepting root CA that the OS trusts (`SELF_SIGNED_CERT_IN_CHAIN`). Create a local, untracked `.npmrc` containing `node-options=--use-system-ca` and run scripts via `npm run …`. Requires Node 22.15+ or 24. Keep this out of git: on a Node 20 host it makes Node refuse to start |
| Local dev server accepts connections but never responds | Hung dev process. Stop every `next dev`, delete `.next`, start one server with `npm run dev` |
| “Missing SUPABASE…” | `.env.local` present and the dev server restarted |
| `ENOTFOUND <something>.supabase.co` | A shell environment variable is overriding `.env.local`. Real process env wins over `.env` files in Next.js. Clear it (`Remove-Item env:NEXT_PUBLIC_SUPABASE_URL`) and restart |
| Odd `.next/dev/types` syntax errors from `tsc` | Two dev servers wrote the generated route types at once. Stop all of them, delete `.next`, start a single server |
| Invalid game code | Game exists; code is 4–8 digits |
| Submission closed | Status must be `COLLECTING_FACTS` |
| No realtime updates | `games` in `supabase_realtime`; RLS allows select |
| Duplicate name | Another player already uses that display name |
| Email confirmation loop | Disable confirm-email in local Auth settings |
| Author visible too early | Confirm clients call `publicStateAction` / `/api/public-state`, not `facts` |

## Project structure

```
app/                 routes (public + /admin + API)
actions/             server actions
components/          UI + game + admin
lib/services/        rules + game-engine
lib/supabase/        browser, server, admin clients
hooks/               realtime + participant identity
supabase/            migration + fictional seed
```
