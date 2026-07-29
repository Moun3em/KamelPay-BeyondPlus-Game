# THE FIVE-CORNER COMPLIANCE SIMULATION
## Platform PRD — for implementation by Claude Code, deployed on Vercel

**Client:** Kamel Pay · **Producer:** Beyond Plus
**Event window:** 08:00–11:00, game loop 09:00–10:00, debrief 10:00–10:25
**Scale:** ≤ 12 tables × 5 concurrent BYOD devices = **60 concurrent clients, ~25 writes/second peak**
**Session length:** 75 minutes, single-use, one event

---

## 0. THE PRIME DIRECTIVE

> **A dropped phone must never cost a team the game.**

This platform will run once, at 9am, on 50 executives' personal phones, over venue Wi-Fi, in front of the client. Every architectural decision below is subordinate to that sentence. Feature richness is worth nothing here; a table that cannot rejoin in 5 seconds is a commercial failure in the room.

Concretely, that means: server-authoritative state, no client-side score, aggressive optimistic UI, and **every single interactive path must have a facilitator override.**

---

## 1. SCOPE

### In scope (V1, must ship)
Team join & role claim · QR invoice scanning with server validation · asymmetric role dashboards · live scoring engine · trade validation at ASP stations · timed outage event with puzzle · green-card automation unlock · projection leaderboard · facilitator control console · full state recovery.

### Explicitly out of scope
Accounts, passwords, email, any PII · native apps · offline-first sync · multi-event tenancy · post-event analytics dashboards · CMS for card content (cards are seeded from JSON at deploy).

---

## 2. STACK

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Vercel-native |
| Hosting | **Vercel**, single region **`fra1`** or **`dxb1` if available** | Pin the region. Latency to the venue is the whole ballgame |
| Database | **Vercel Postgres (Neon)** | Relational, transactional, and the scoring engine needs real transactions |
| Realtime | **Server-Sent Events** via a Node runtime route | Simpler and more resilient than WebSockets behind hotel Wi-Fi and corporate proxies. One-directional push is all we need; writes go over plain POST |
| State cache | **Vercel KV (Redis)** for the live tick + leaderboard fanout | Avoids hammering Postgres 60× per second for the clock |
| QR scanning | **`@zxing/browser`** in-browser, `getUserMedia` | No native app, works in iOS Safari 15+ and Chrome |
| Styling | **Tailwind**, custom tokens per §6 | |
| Auth | **Table PIN + role claim, cookie-persisted.** No user accounts | |

> **Do not use WebSockets.** Corporate mobile devices on guest Wi-Fi with MDM proxies break WS connections in ways you cannot debug at 09:07. SSE degrades to long-poll gracefully and survives proxy interference.

> **Do not use edge runtime for anything stateful.** Pin the scoring routes to `runtime = 'nodejs'` in a single region so that transaction ordering is sane.

---

## 3. DATA MODEL

```sql
-- Seeded at deploy from cards_seed.json. Never mutated during play.
CREATE TABLE cards (
  card_id           TEXT PRIMARY KEY,        -- 'RED-T03-V1'
  qr                TEXT UNIQUE NOT NULL,    -- 'KP5C-A3F91B2C4D' (opaque)
  deck              TEXT NOT NULL,           -- RED | GREEN | BLUE | PRACTICE
  archetype         TEXT NOT NULL,           -- V1..V6 | X1..X6 | GRN-0n | BLU-0n
  owner_table       INT  NOT NULL,
  validity          TEXT,                    -- VALID | INVALID | OUT_OF_SCOPE
  correct_action    TEXT,                    -- FILE | QUARANTINE
  penalty_aed       INT DEFAULT 0,
  locked_until_phase TEXT,                   -- NULL | 'B' | 'C'
  payload           JSONB NOT NULL           -- all printed copy + the 'why' teaching text
);

CREATE TABLE teams (
  table_no          INT PRIMARY KEY,
  pin               TEXT UNIQUE NOT NULL,
  display_name      TEXT,                    -- optional, self-chosen, profanity-filtered
  capital_aed       BIGINT NOT NULL DEFAULT 1000000,
  ledger_closed     BOOLEAN DEFAULT FALSE,
  outage_active     BOOLEAN DEFAULT FALSE,
  outage_started_at TIMESTAMPTZ,
  outage_resolved_at TIMESTAMPTZ,
  green_unlocked    BOOLEAN DEFAULT FALSE,
  badges            TEXT[] DEFAULT '{}'
);

CREATE TABLE devices (
  device_id         UUID PRIMARY KEY,        -- generated client-side, stored in cookie
  table_no          INT REFERENCES teams,
  role              TEXT,                    -- CFO | TAX | CIO | PROCUREMENT | OPS
  last_seen         TIMESTAMPTZ,
  UNIQUE (table_no, role)                    -- one device per role per table
);

-- The append-only truth. Score is DERIVED, never stored as a running total
-- anywhere but the teams.capital_aed cache.
CREATE TABLE events (
  id                BIGSERIAL PRIMARY KEY,
  at                TIMESTAMPTZ DEFAULT now(),
  table_no          INT NOT NULL,
  actor_role        TEXT,
  kind              TEXT NOT NULL,           -- see §4.2
  card_id           TEXT REFERENCES cards,
  delta_aed         BIGINT NOT NULL DEFAULT 0,
  meta              JSONB,
  idempotency_key   TEXT UNIQUE              -- client-generated; kills double-scan
);

CREATE TABLE card_positions (
  card_id           TEXT PRIMARY KEY REFERENCES cards,
  held_by_table     INT NOT NULL,
  state             TEXT NOT NULL DEFAULT 'PENDING'  -- PENDING|FILED|QUARANTINED|TRADED
);

CREATE TABLE game_state (              -- single row, id = 1
  id                INT PRIMARY KEY DEFAULT 1,
  phase             TEXT DEFAULT 'LOBBY',  -- LOBBY|TUTORIAL|A|B|C|FROZEN|DEBRIEF
  clock_started_at  TIMESTAMPTZ,
  clock_paused_at   TIMESTAMPTZ,
  paused_ms_total   INT DEFAULT 0,
  narrative_banner  TEXT
);
```

### 3.1 Table PINs — a hard coupling between print and platform

`teams.pin` is **not generated by the application.** PINs are produced by `generate_cards.py --pin-seed <seed>`, written to `cards_seed.json` (`meta.pin_seed`, `teams[]`) and to `table_pins.csv`, and that CSV goes to the printer at T−14 days. The platform seeds those exact values.

- Character set excludes O/0, I/1, S/5, B/8, Z/2 — these are read aloud across a noisy ballroom by people not wearing reading glasses.
- Generation is deterministic given the seed, so print and platform cannot silently drift.
- **Record the seed used for the printed run.** Regenerating with a different seed after cards are printed means 50 people cannot log in, and it is undetectable until the morning.
- The join URL embedded in the printed QR (`https://[DOMAIN]/join?t=03`) requires the production domain to be fixed **before print**, not before launch.

**Three non-negotiables in this schema:**

1. **`events` is append-only and `idempotency_key` is UNIQUE.** A phone on flaky Wi-Fi will retry a scan POST. Without this you will pay a team twice and lose the room's trust in the scoreboard, which is unrecoverable.
2. **Score is derived.** `teams.capital_aed` is a cache; `SUM(delta_aed) FROM events` is the truth. If they ever disagree, the sum wins and you can prove any number on the leaderboard to a sceptical CFO in the debrief. Ship a `/api/audit/[table]` endpoint that renders the full event log — a room of finance people **will** ask.
3. **`clock_paused_at` / `paused_ms_total` exist because the game will be paused.** Fire alarm, late VIP, a projector dying. A clock that cannot pause is a clock that ends your event.

---

## 4. GAME ENGINE

### 4.1 Phases and the clock

| Phase | Duration | Trigger | What unlocks |
|---|---|---|---|
| `LOBBY` | — | manual | Join + role claim only |
| `TUTORIAL` | 3 min | facilitator | Practice card scan; camera permission check |
| `A` — Internal Audit | 15 min | auto or manual | RED deck live |
| `B` — Five-Corner Trade | 25 min | auto at A+15 | BLUE deck + ASP station validation |
| `C` — Outage & Control | 20 min | auto at B+25 | Outage fires per table; GREEN unlocks on resolve |
| `FROZEN` | — | auto at C end | All writes rejected, leaderboard locks |
| `DEBRIEF` | 25 min | manual | Leaderboard + badges + per-table audit view |

The clock is computed server-side on every request as
`elapsed = now() - clock_started_at - paused_ms_total`.
**Clients never hold authoritative time.** They render a local countdown for smoothness and resync on every SSE tick (2s interval).

### 4.2 Event kinds and scoring

| `kind` | Δ AED | Notes |
|---|---|---|
| `FILE_VALID_OWN` | **+50,000** | Card owned by this table, `validity = VALID` |
| `FILE_FOREIGN` | **0** | Rejected: "This TRN is not yours. Corner 3 refuses the document." |
| `FILE_INVALID` | **−(penalty)** | −100 or −5,000 per the card. Triggers the teaching modal |
| `FILE_OUT_OF_SCOPE` | **0** | X6 only. "Not reportable. You spent a cycle on a consumer sale." |
| `QUARANTINE_CORRECT` | **+10,000** | Correctly withheld an invalid/out-of-scope card |
| `QUARANTINE_INCORRECT` | **−25,000** | Quarantined a valid invoice — revenue not billed |
| `TRADE_VALIDATED` | **+5,000** | Both sides, on ASP station validation |
| `LEDGER_CLOSED` | **+75,000** | One-time, on filing all 6 own valid invoices |
| `OUTAGE_TICK` | **−1,000** | Every 10s while `outage_active` |
| `OUTAGE_RESOLVED` | 0 | Stops ticks, sets `green_unlocked = true` |
| `GREEN_PLAYED` | varies | Per §2.6 of the physical pack |
| `BLUE_PLAYED` | varies | Requires counterparty table_no in `meta` |
| `FACILITATOR_ADJUST` | any | Manual override. **Always** logged with a reason string |

**Penalty damper (GRN-03)** and **implementation immunity (GRN-01)** are applied at write time by the scoring service, not by the client.

### 4.3 The scan endpoint — the single most important route

`POST /api/scan` · `{ qr, deviceId, action: 'FILE' | 'QUARANTINE', idempotencyKey }`

```
BEGIN TRANSACTION
  1. Resolve device → table_no, role.       reject if role != 'TAX' → 403 with the reason
  2. Resolve qr → card.                     unknown → 404 "Card not recognised"
  3. Check game_state.phase allows this deck. locked → 409 with the unlock hint
  4. Check card_positions.held_by_table = this table. not held → 409 "Table 07 holds this card"
  5. Check card not already FILED/QUARANTINED → 409 idempotent-safe replay of original result
  6. Compute delta via scoring service (applies dampers, immunities, multipliers)
  7. INSERT INTO events (idempotency_key)   ON CONFLICT DO NOTHING → replay returns original
  8. UPDATE card_positions.state
  9. UPDATE teams.capital_aed
  10. Check ledger-close condition → maybe INSERT LEDGER_CLOSED
COMMIT
→ publish to KV → SSE fanout to all devices on this table + projection
→ RESPOND with the teaching modal payload
```

**The response is a teaching artefact, not a status code.** Every scan returns the card's `payload.why` — the regulatory explanation — rendered as a full-screen modal on the Tax Director's device that requires a deliberate tap to dismiss. Correct or incorrect, the player learns the rule at the exact moment they care most about it. This is where the educational value actually lands; the score is just the reason they're paying attention.

### 4.4 The outage (Phase C)

- Fires per table on a **randomised offset of 0–180s** into Phase C, so ten alarms do not go off simultaneously and the room stays legible.
- **Randomiser is score-aware:** leading tables get an earlier, harder outage; trailing tables get a later one with an extra hint. This is the rubber-banding that keeps table 9 in the game at minute 50. Implement as a simple rank-based offset — do not overthink it.
- CIO device shows the "encrypted system log". The puzzle answer is the **five-corner routing sequence**, readable from the board and the laminated sheet: the team enters the corner order for a supplier-issued invoice → **`1-3-4-2-5`**.
- Ticks −1,000 every 10s until resolved. **Hard floor: a table can lose at most AED 150,000 to the outage.** Without this cap a table that misreads the puzzle loses the game in ninety seconds and disengages for the last fifteen minutes.
- Three wrong entries → the CIO device reveals a hint pointing at the board. Five wrong → facilitator override unlocks it. **Nobody stays stuck.**
- On resolve: badge `CRISIS_MANAGER` to the first table only, `green_unlocked = true` for that table.

### 4.5 Badges (computed continuously, displayed on the projection)

| Badge | Rule |
|---|---|
| `CRISIS_MANAGER` | First table to resolve its outage |
| `ALLIANCE_BUILDER` | Most `TRADE_VALIDATED` events |
| `ZERO_PENALTY_PIONEER` | No negative-delta event in the first 30 minutes |
| `THE_SCEPTIC` | Correctly quarantined the B2C card (X6) — the reverse trap |
| `CLEAN_CLOSE` | Ledger closed with zero penalties |

Award at least one badge to **every** table before the leaderboard reveal. If a table has none, the facilitator console has a manual grant. A room of senior executives contains nobody who enjoys being publicly last with nothing.

---

## 5. SCREENS

### 5.1 Join flow (must complete in under 30 seconds)

```
Scan table QR  →  /join?t=03
                    ↓
            "TABLE 03 — enter PIN"        [ K7M4XR ]     ← 48px numeric-ish keypad
                    ↓
            "CLAIM YOUR ROLE"
            ┌──────────────────────────────┐
            │  CFO                    ○    │   ← 64px tall rows, taken roles greyed
            │  TAX & COMPLIANCE       ○    │      with "taken by another device"
            │  CIO                    ○    │
            │  PROCUREMENT            ○    │
            │  OPERATIONS             ○    │
            └──────────────────────────────┘
                    ↓
            Practice card scan → camera permission granted → IN
```

**Degraded mode is mandatory.** If a table has fewer than 5 devices connected:
- **CFO, TAX and CIO are the three required roles.** The app must warn a table that has not claimed all three, and the facilitator console must surface it as a red flag before Phase A starts.
- With 1 device: it claims **ALL_ROLES** and the dashboard becomes a tabbed single-screen view. The game is still fully playable, just less interesting. Ship this. Someone's phone will be dead.
- With 0 devices: facilitator console can operate a table by proxy.

### 5.2 CFO — The Balance Sheet

The only screen showing money and the clock. Large, calm, three regions:

```
┌────────────────────────────────────────┐
│  T-03                        ⏱ 34:12   │  ← 40px clock, always visible
├────────────────────────────────────────┤
│                                        │
│      AED 1,240,000                     │  ← 56px, tabular-nums, animates on change
│      CORPORATE VALUATION               │
│                                        │
│      ▲ +50,000    Invoice filed        │  ← last 3 events, plain language
│      ▼ −100       PDF rejected         │
│      ▲ +5,000     Trade cleared        │
├────────────────────────────────────────┤
│  LEDGER          ████████░░  4 of 6    │  ← the pressure gauge
│  Missing: V4 (T-02) · V5 (T-01)        │  ← names the table to walk to
└────────────────────────────────────────┘
```

The "Missing" line is the engine of Phase B. It must name the **table number**, not just the card, or Procurement has nowhere to walk.

### 5.3 Tax & Compliance Director — The Scanner

One giant button. Nothing else above the fold.

```
┌────────────────────────────────────────┐
│         [ CAMERA VIEWFINDER ]          │  ← 60% of viewport
│                                        │
├────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐   │
│   │              │  │              │   │
│   │  ▲  FILE     │  │  ⛔ QUARANTINE│   │  ← 96px tall, thumb-reachable
│   │              │  │              │   │
│   └──────────────┘  └──────────────┘   │
│   Can't scan?  [ ENTER CARD ID ]       │  ← THE FALLBACK. Ship it.
└────────────────────────────────────────┘
```

Scan → card detail renders → **the player must then choose FILE or QUARANTINE.** The scan itself is never the commitment. This separation is the difference between a game about camera dexterity and a game about compliance judgement.

**The manual card-ID entry fallback is not optional.** Cameras fail: cracked screens, denied permissions, corporate MDM blocking `getUserMedia`, a lens smeared with breakfast. Every card carries a human-readable ID under the QR precisely for this.

### 5.4 CIO — The System Monitor

Deliberately, provocatively empty until minute 40.

```
  ┌──────────────────────────────────┐
  │  ● ALL SYSTEMS NOMINAL           │
  │                                  │
  │  Supplier ASP        connected   │
  │  Buyer ASP           connected   │
  │  FTA reporting       real-time   │
  │                                  │
  │  Uptime  00:34:12                │
  └──────────────────────────────────┘
```

Then, at outage: full-screen red, an audible alarm (**with a visible mute — some of this room will be in a live Teams call**), a haptic burst, the encrypted log, and the corner-sequence input.

The empty state should include one line of dry copy: *"Nothing is wrong. This is the most dangerous screen in the room."*

### 5.5 Procurement & Operations — The Trade Portal

```
  YOU NEED                     WALK TO
  ─────────────────────────────────────
  Invoice V4                   TABLE 02
  Invoice V5                   TABLE 01
  Invoice V6                   TABLE 10

  YOU ARE HOLDING              THEY NEED IT
  ─────────────────────────────────────
  T-04's V4                    TABLE 04
  T-05's V5                    TABLE 05
  T-06's V6                    TABLE 06
```

Nothing else. This screen exists to get someone out of their chair and give them a sentence to open with. Add one line at the bottom: *"You cannot close your ledger from this chair."*

### 5.6 Projection screen (`/projection`, 1920×1080, no interaction)

- **Leaderboard**: table number, valuation, rank, badge chips. Animated rank changes.
- **Clock**: enormous, top right.
- **Narrative banner**: the Storytelling Engine's current message, pushed by the facilitator.
- **Live activity ticker**: *"T-07 filed a free-zone invoice · T-02 was fined AED 100 for a PDF · T-09 cleared a trade"* — anonymised to table numbers, and the single best driver of room energy.
- **Never show a table at zero or negative.** Floor the display at AED 100,000 and label it "under FTA review". Public humiliation kills a corporate room.

Runs on a laptop on Ethernet, not Wi-Fi. Auto-reconnects on SSE drop with an exponential backoff and a visible "reconnecting" pip that a facilitator can spot from the floor.

### 5.7 Facilitator console (`/console`, PIN-gated)

The most under-specified screen in most builds of this kind, and the one that saves the event. It must have, on one screen:

- **Phase control**: advance / rewind / **PAUSE ALL** (the big one)
- **Per-table row**: devices connected · roles claimed · capital · cards filed · outage state · last activity timestamp
- **Red flags**: any table with < 3 roles claimed, no activity in 3 minutes, or capital dropping fast
- **Manual actions per table**: grant/deduct capital (with mandatory reason), force-resolve outage, unlock green deck, award badge, reset a device
- **ASP validation mode**: scan two PINs + a card → clears a trade
- **Broadcast**: push a narrative banner to all devices and the projection
- **Kill switch**: freeze all writes

Every facilitator action writes to `events` with the actor recorded. When a CFO asks "why did we lose 5,000", someone must be able to answer.

---

## 6. UI SPECIFICATION (non-negotiable, age-inclusive)

| Token | Value |
|---|---|
| `--bg` | `#121212` (dark) / `#FFFFFF` (light) — **pure, no tinted greys** |
| `--fg` | `#FFFFFF` / `#121212` — contrast ratio ≥ 7:1 everywhere |
| Corner 1 Supplier | `#E5484D` |
| Corner 2 Buyer | `#3E63DD` |
| Corner 3 Supplier ASP | `#30A46C` |
| Corner 4 Buyer ASP | `#F76B15` |
| Corner 5 FTA | `#8E4EC6` |
| Body text | **18px minimum**, line-height **1.5** |
| Numerics | 40–56px, `font-variant-numeric: tabular-nums` |
| Font | Inter or Atkinson Hyperlegible, weight ≥ 500. **Never a light weight.** |
| Tap targets | **48 × 48px minimum**, 16px minimum spacing |
| Gestures | **Single tap only.** No pinch, no long-press, no double-tap, no swipe-to-action |
| Motion | Respect `prefers-reduced-motion`. No parallax, no auto-carousels |
| Feedback | Every action: visual + haptic (`navigator.vibrate`) + optional sound, all independently sufficient |

**Colour is never the only signal.** Every state carries an icon and a word alongside its colour — a meaningful share of a 50-person male-skewed finance audience has some colour vision deficiency, and red/green is exactly the axis this game runs on.

Test on: **iPhone SE (small), iPhone 15 Pro, a mid-range Android, and one device with system font scaling at 200%.** The last one is not hypothetical for this demographic.

---

## 7. RESILIENCE — THE 09:07 CHECKLIST

Failures ranked by likelihood, each with its required mitigation:

| Failure | Likelihood | Mitigation (must be built) |
|---|---|---|
| A phone loses Wi-Fi mid-scan | **Certain** | Idempotency key + optimistic UI + retry queue in `sessionStorage`. On reconnect, replay. |
| Browser tab is killed by iOS | **Certain** | Device ID in a cookie. Reopening the URL restores role and state in < 3 seconds, with no re-entry of the PIN. |
| Someone's camera won't grant permission | **Very likely** | Manual card-ID entry, always visible, never behind a menu. |
| Venue Wi-Fi degrades under 60 devices | **Likely** | SSE with backoff; poll fallback at 5s. Payloads small (< 2KB). Test at load T−1 day. |
| Two devices claim the same role | **Likely** | DB unique constraint. Second device gets "CFO is taken — claim another role or ask them to release." |
| A table's device runs out of battery | **Likely** | Any device can re-claim any released role with the table PIN. Facilitator can release a role. |
| Projection laptop disconnects | **Possible** | Ethernet + auto-reconnect + visible reconnecting indicator. |
| The whole platform goes down | **Low, catastrophic** | **Printed paper score sheets in the facilitator kit.** The game is 70% physical; it can be finished on paper. Rehearse this once. |

**Load test before the event: 60 simulated clients, 25 writes/sec, for 15 minutes.** Not on the morning.

---

## 8. BUILD ORDER FOR CLAUDE CODE

Ship in this sequence. Each step should be independently demoable.

1. **Schema + seed** from `cards_seed.json`. `pnpm seed --tables 10`.
2. **Join flow**: table QR → PIN → role claim → cookie. Includes the taken-role and degraded-mode paths.
3. **Scan endpoint** with full transaction, idempotency, and the teaching-modal response. Unit-test every branch of §4.3 — this is where the money is.
4. **Scanner UI** with `@zxing/browser` **and** the manual-entry fallback in the same commit. Do not ship one without the other.
5. **CFO dashboard** + SSE fanout.
6. **Facilitator console** — before the remaining player screens. If the console works you can run the event with a half-finished app; the reverse is not true.
7. **Projection screen.**
8. **CIO / outage engine** including the cap, the hint escalation and the override.
9. **Trade validation** at ASP stations.
10. **Green deck automation**, GRN-04 last — it touches every other rule.
11. **Badges + debrief view + `/api/audit/[table]`.**
12. **Accessibility pass** against §6, on real devices.
13. **Load test.** **Full dry run with five people who have never seen it.**

### Repo layout
```
/app
  /join /play/[role] /projection /console
  /api/scan /api/state /api/stream /api/trade /api/outage /api/console/* /api/audit/[table]
/lib
  scoring.ts        ← pure functions, exhaustively unit-tested
  engines/          ← timing, randomiser, badges, narrative
  db.ts  sse.ts
/data
  cards_seed.json   ← generated by generate_cards.py
/scripts
  seed.ts  loadtest.ts
```

`lib/scoring.ts` must be **pure and fully unit-tested**: given a card, a team state and an action, return a delta and a modal payload. No I/O. This is the one file where a bug is publicly visible to fifty finance executives, and it is trivially testable — so test it exhaustively.

---

## 9. ACCEPTANCE CRITERIA

The build is done when all of these are true on real hardware:

- [ ] A new phone goes from scanning the table tent to scanning a practice card in **under 30 seconds**, without instruction
- [ ] Killing the browser and reopening restores full state in **under 3 seconds**, no re-auth
- [ ] Double-tapping FILE on a flaky connection scores **exactly once**
- [ ] Every scan returns the regulatory explanation, correct or incorrect
- [ ] A table with only one connected device can complete the full game
- [ ] The camera can be entirely disabled and the game remains completable via manual entry
- [ ] Every player screen passes WCAG AAA contrast and works at 200% system font scaling
- [ ] The outage cannot cost a table more than AED 150,000 and cannot leave a table permanently stuck
- [ ] `SUM(events.delta_aed)` equals `teams.capital_aed` for every table, at any moment
- [ ] The facilitator console can run a full game for a table with zero connected devices
- [ ] 60 concurrent clients at 25 writes/sec for 15 minutes, p95 write latency < 400ms
- [ ] Every table finishes with at least one badge

---

## 10. THE COMMERCIAL HANDOFF

Two things the platform owes the sales motion, and they should be built, not improvised:

**The debrief data view.** At 10:00 the MC needs, on the projection, in one glance: total fines levied across the room, the count of X3 (direct-email) cards wrongly filed, the average time-to-close for tables that played GRN-04 versus those that did not. That last comparison *is* the EPPA "Patterns" section, and it will be far more persuasive delivered as this room's own data than as a claim.

**The CTA.** A single `/book` route behind the QR on the debrief cards, holding a booking form for the AP Compliance & Operational Risk Assessment. It sits outside the no-PII boundary by design — this one is a deliberate, consented capture on a separate route with its own privacy notice. **Do not let it share a database with the game.** A room of compliance officers will ask, and "the game database contains no personal data of any kind, and this booking form is separate and consented" is an answer that closes rather than opens a conversation.

---

*Regulatory content in the card payloads was verified against current UAE guidance as at July 2026. Re-verify before the event.*

**Sources for the regulatory content:**
- [UAE Cabinet Decision No. 106 of 2025: Penalties for E-Invoicing Non-Compliance — VATupdate](https://www.vatupdate.com/2025/12/08/uae-cabinet-decision-no-106-of-2025-penalties-for-e-invoicing-non-compliance/)
- [e-Invoicing Penalties Under Cabinet Decision 106/2025 — ClearTax](https://www.cleartax.com/ae/uae-e-invoicing-penalties-cabinet-decision)
- [e-Invoicing UAE: Key Requirements, Implementation Timeline — ClearTax](https://www.cleartax.com/ae/e-invoicing-uae)
- [UAE e-Invoicing Mandate: Timelines, Peppol Model — Taxilla](https://www.taxilla.com/uae-e-invoicing-mandate-peppol-compliance-guide)
- [Peppol E-Invoicing in the UAE: 2026–2027 Compliance Guide — Infinite IT](https://infinite-it.com/en/blog/peppol-e-invoicing-uae-guide)
- [UAE E-Invoicing Scope, Exclusions And Transaction Types (B2B, B2G, B2C) — Rockford](https://rockfordcomputer.ae/uae-e-invoicing-scope-executions-b2b-b2g-b2c/)
- [UAE E-Invoicing for Free Zone Companies: DMCC, JAFZA, IFZA, ADGM, DIFC, RAKEZ — Marmin](https://marmin.ai/uae-e-invoicing-for-free-zone-companies-dmcc-jafza-ifza-adgm-difc-and-rakez/)
