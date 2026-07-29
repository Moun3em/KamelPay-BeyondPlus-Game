# AGENTS.md — Five-Corner Compliance Simulation

**Place this file at the root of the code repo.** Cursor re-reads it on every turn. Everything here is a standing rule, not a suggestion. If a rule below conflicts with something you decided earlier in the session, this file wins.

*(If your Cursor version predates AGENTS.md support, copy this to `.cursorrules` as well.)*

---

## What this is

A single-use event platform. It runs **once**, live, at 09:00 GST, on ~50 executives' personal phones, over venue Wi-Fi, in front of a paying client. No second attempt, no patch window.

Spec: `02_Platform_PRD.md`. Game data: `cards_seed.json`. Physical context: `01_Physical_Game_Pack.md`.

## Prime directive

> **A dropped phone must never cost a team the game.**

Resilience beats features, always. If choosing between a better animation and a more reliable reconnect, there is no choice to make.

## Standing rules

1. **SSE, never WebSockets.** Corporate MDM proxies on guest Wi-Fi break WS in ways you cannot debug at 09:07.
2. **`runtime = 'nodejs'`, single region, on every stateful route.** No edge runtime for anything that writes.
3. **`events` is append-only. `idempotency_key` is UNIQUE.** Score is derived (`SUM(delta_aed)`); `teams.capital_aed` is only a cache. If they disagree, the sum wins.
4. **`lib/scoring.ts` is pure — no I/O, no imports from `db.ts`.** Tests before UI. Every branch.
5. **Zero PII.** Teams are `Table 03`, players are roles. No name/email/phone field anywhere. Sole exception: the `/book` CTA route, which has its own privacy notice and **must not share a database with the game**.
6. **UI floor (PRD §6):** 18px body minimum, 48×48px tap targets, 7:1 contrast, single-tap only. No pinch, long-press, double-tap or swipe-to-action. Audience is 45–70.
7. **Colour is never the only signal.** Every state carries an icon *and* a word. This game runs on a red/green axis in front of a male-skewed finance audience.
8. **Every player-facing dead end needs a `/console` override.** If a player can get stuck, a facilitator must be able to unstick them.
9. **Every scan returns `payload.why`** — the regulatory explanation — as a modal requiring a deliberate tap. Correct or incorrect. This is where the learning lands.
10. **Never invent game rules, point values, card copy or regulatory claims.** Every number comes from `cards_seed.json` or PRD §4.2. Regulatory text is pre-verified in the card payloads. Underspecified? Ask. Do not guess. Wrong AED figures on screen in front of this audience are worse than a missing feature.
11. **Never expand scope.** No accounts, offline sync, analytics dashboards, CMS, multi-tenancy, or native app. Scope creep is the main way this build fails.
12. **Disagree out loud.** If you think the PRD is wrong, argue for it. Never silently deviate.

## Camera / HTTPS — read before touching the scanner

`getUserMedia` requires a secure context. **You cannot test the scanner on a phone pointed at `http://localhost:3000` or a LAN IP.** It will fail silently or be blocked, and you will wrongly conclude the code is broken.

Test the scanner **only** via:
- a Vercel preview deployment (preferred), or
- an HTTPS tunnel (`ngrok http 3000` / `cloudflared tunnel`)

Every scanner change gets verified on a real phone over HTTPS before it is called done. Desktop-browser webcam testing does not count.

## Data you must not regenerate casually

`cards_seed.json` contains the **table PINs**, produced by `generate_cards.py --pin-seed <seed>`. Those exact PINs are **printed on physical cards**. Regenerating with a different seed silently desynchronises the platform from the print run and nobody discovers it until 50 people cannot log in.

- Seed the DB from `cards_seed.json`. Never hand-author card or PIN data.
- If you must regenerate, reuse the seed recorded in `meta.pin_seed`.

## Definition of done for any step

- PRD §9 criteria touched by this step pass **on real hardware** (iPhone SE, one Android, one device at 200% system font scaling)
- New logic in `lib/scoring.ts` has exhaustive unit tests
- Nothing in the standing rules above was violated

## After each step, report

1. What you built
2. What you deliberately deferred
3. Which PRD §9 criteria now pass
4. Anything you had to guess (this list should be empty — if it isn't, you should have asked)
