# Cursor Agent Prompt — Five-Corner Compliance Simulation

Copy everything below the line into Cursor with this folder attached.

---

You are building a production event platform that runs **once**, live, on **29 [MONTH] 2026 at 09:00 Gulf Standard Time**, on the personal phones of ~50 UAE finance executives, over venue Wi-Fi, in front of a paying client. There is no second attempt and no patch window. Build accordingly.

## Step 0 — before you read anything else

Copy `AGENTS.md` to the root of the repo you are about to create. It contains the standing rules and you are expected to obey them on every turn for the rest of this build, not just this one.

## Read first, in this order

1. `AGENTS.md` — standing rules. Non-negotiable.
2. `02_Platform_PRD.md` — the specification. This is the contract. Follow it.
3. `cards_seed.json` — the exact game data. Seed from this file; never hand-write card or PIN content. It is ~190KB — read `meta`, `economy`, `teams`, and **two** sample cards to learn the shape. Do not pull the whole file into context repeatedly.
4. `01_Physical_Game_Pack.md` — the physical game the software wraps. Read §1 (trade ring) and §2 (card decks) so you understand what a "card" and a "table" physically are. You are not building anything from this file, but the software makes no sense without it.
5. `generate_cards.py` — how the seed is produced. Do not edit the card economy here; if a number needs to change, change it in the PRD and regenerate.

## Preflight — ask me for these before writing code

Do not invent, stub or guess any of the following. Stop and ask:

| Item | Why you cannot proceed without it |
|---|---|
| **Repo location** — new folder, or a subfolder of this one? | Determines where you scaffold |
| **`POSTGRES_URL`** (Vercel Postgres / Neon) | Step 1 is schema + seed |
| **`KV_REST_API_URL` + `KV_REST_API_TOKEN`** | Live clock and leaderboard fanout |
| **Vercel project + team, and the deploy region** | PRD §2 requires a pinned single region |
| **The production domain** | It goes into the printed join QR codes and the PIN cards |
| **The real event date** | Goes in the freeze logic and the countdown |
| **An HTTPS tunnel or preview URL for phone testing** | See below — the scanner cannot be tested without one |

If I have not provided something, ask once, clearly, and wait. Do not scaffold around a placeholder connection string.

## The camera constraint that will waste your day if you ignore it

`getUserMedia` requires a secure context. **The scanner cannot be tested on a phone pointed at `http://localhost:3000` or a LAN IP.** It fails silently. You will conclude the code is broken when it is not.

Test the scanner only over HTTPS — a Vercel preview deployment, or `ngrok http 3000`. Desktop webcam testing does not count as verification. Confirm you have an HTTPS path to a real phone **before** you start step 4.

## The prime directive

> **A dropped phone must never cost a team the game.**

Every trade-off resolves in favour of resilience over features. A table that cannot rejoin in 5 seconds is a commercial failure in the room. If you find yourself choosing between a nicer animation and a more reliable reconnect, there is no choice to make.

## Non-negotiable constraints

- **Stack exactly as specified in PRD §2.** Next.js 15 App Router + TypeScript, Vercel Postgres, Vercel KV, SSE (**never WebSockets** — corporate MDM proxies break them), `@zxing/browser`, Tailwind. Pin scoring routes to `runtime = 'nodejs'`, single region.
- **Zero PII.** No emails, no names, no phone numbers, no real company names. Teams are `Table 03`. Players are roles. If you are about to add a text field that a human could type their name into, stop. The one exception is the `/book` CTA route, which must live behind its own privacy notice and **must not share a database with the game**.
- **Table PINs in `cards_seed.json` are printed on physical cards.** Seed them verbatim. Never regenerate with a different `--pin-seed`, never auto-generate at runtime. A mismatch means 50 people cannot log in and nobody finds out until 09:00.
- **`events` is append-only with a UNIQUE `idempotency_key`.** Score is derived (`SUM(delta_aed)`), never authored. `teams.capital_aed` is a cache. If they ever disagree, the sum wins.
- **`lib/scoring.ts` is pure and has no I/O.** Given a card, a team state and an action, it returns a delta and a modal payload. Unit-test every branch exhaustively. This is the one file where a bug is visible to fifty finance executives.
- **UI spec in PRD §6 is a hard requirement, not a guideline.** 18px minimum body text, 48×48px minimum tap targets, WCAG AAA contrast (7:1), single-tap only — no pinch, no long-press, no swipe-to-action. The audience is 45–70 years old. Colour is never the only signal; every state carries an icon and a word.
- **Every interactive path needs a facilitator override.** If a player can get stuck, a facilitator must be able to unstick them from `/console`.
- **Every scan returns the regulatory teaching text** from `payload.why`, correct or incorrect, as a full-screen modal requiring a deliberate tap. This is where the educational value lands; the score is just why they're paying attention.

## Build order

Follow **PRD §8** exactly. Each step must be independently demoable before you start the next. Do not run ahead.

Two ordering decisions that look wrong and are not:

- **The facilitator console (step 6) comes before the remaining player screens.** With a working console you can run the event on a half-finished app. The reverse is not true.
- **The scanner UI and the manual card-ID fallback ship in the same commit (step 4).** Never one without the other. Cameras fail: cracked lenses, denied permissions, MDM blocking `getUserMedia`, breakfast on the glass.

## Working agreement

- Small, focused commits. One PRD step per branch.
- Write the tests for `lib/scoring.ts` **before** the UI that calls it.
- After each step, tell me: what you built, what you deliberately deferred, and which PRD acceptance criteria in §9 now pass.
- **Do not invent game rules, card content, point values or regulatory claims.** Every number comes from `cards_seed.json` or PRD §4.2. Every regulatory statement comes from the card payloads, which are already verified. If something is genuinely underspecified, ask me — do not guess. Wrong regulatory content in front of this audience is worse than a missing feature.
- **Do not add features not in the PRD.** No accounts, no offline sync, no analytics dashboard, no CMS, no multi-tenancy, no native app. Scope creep is the main way this build fails.
- If you believe the PRD is wrong about something, say so and argue for it. Do not silently deviate.

## Definition of done

All of **PRD §9** passes on real hardware — including an iPhone SE, one Android, and one device at 200% system font scaling. Plus:

- 60 concurrent clients, 25 writes/sec, 15 minutes, p95 write latency under 400ms
- Killing the browser and reopening restores full state in under 3 seconds with no re-auth
- Double-tapping FILE on a throttled connection scores exactly once
- The game is completable with the camera entirely disabled
- A table with one connected device can complete the full game
- The facilitator console can run a table with zero connected devices

## Start here

Confirm you have read all four files. Then summarise, in your own words and in under 200 words: the trade ring, why the green deck is locked until Phase C, and what `idempotency_key` is protecting against. If any of those three is unclear to you, ask before writing code — they are the three things that break silently and expensively.

Then begin at PRD §8 step 1: schema and seed.
