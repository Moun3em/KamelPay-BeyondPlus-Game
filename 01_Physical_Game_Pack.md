# THE FIVE-CORNER COMPLIANCE SIMULATION
## Physical Game Pack — Design & Print Specification

**Client:** Kamel Pay · **Producer:** Beyond Plus
**Format:** Phygital serious simulation, 60-minute core loop + 25-minute EPPA debrief
**Audience:** 40–50 UAE finance and compliance executives
**Configuration:** Number-agnostic. Validated for 6–12 tables of 5. Recommended build: **10 tables** (prints for 10, plays fine with 8).

---

## 0. THE ONE THING TO GET RIGHT

Every design decision below serves a single mechanic: **a team cannot win by being fast. It can only win by reading carefully and talking to strangers.**

Six of the ten invoices on each table are filable. Four are traps. Three of the six filable ones are physically sitting on someone else's table. There is no way to close your ledger without standing up. That is the entire pedagogy, and it is why the cards are printed the way they are.

---

## 1. THE TRADE RING (why the card distribution is what it is)

Tables are arranged in a logical ring. Table T owns six valid invoices:

- **3 sit in T's own folder** — findable immediately
- **3 sit in the folders of T+1, T+2, T+3** — obtainable only by negotiation

Symmetrically, T holds one valid invoice each belonging to T−1, T−2 and T−3.

**Properties this guarantees:**

| Property | Result |
|---|---|
| Folder size | Always exactly 10 red cards, any N |
| Dead-ends | Impossible — every missing card has exactly one known holder |
| Monopoly | Impossible — no table can hostage more than one card per counterparty |
| Trade partners | Every table must engage 3 others, and is engaged by 3 others |
| Scales | Works unchanged for N = 6 to 12 |

**Facilitators receive `trade_matrix.csv`** — a one-page sheet showing, for each table, exactly who holds what. This is the unstick tool when a table stalls at minute 30.

> **Physical setup rule:** tables must be numbered and seated in ring order around the room, not clustered by company. A T01 → T02 → T03 walk should be a short walk. Put T01 and T10 adjacent so the ring closes physically as well as logically.

---

## 2. THE CARD DECKS

### 2.1 Print specification — all cards

| Attribute | Specification | Rationale |
|---|---|---|
| **Size** | **90 × 140 mm** (large tarot) | Non-negotiable. Poker size cannot carry 16pt body copy. This audience is 45–70 and reading in ambient 8am light. |
| **Stock** | 350gsm art board | Survives 200 hand-offs and a coffee spill |
| **Finish** | **Matte lamination, both sides** | Gloss creates glare under venue downlights and defeats phone cameras scanning the QR |
| **Corners** | 3 mm rounded | Prevents fanning damage in the folder |
| **Bleed** | 3 mm all round | Standard |
| **Typography** | Inter or Atkinson Hyperlegible | Headline 22pt, body **16pt minimum**, detail lines 14pt, never lighter than 500 weight |
| **Contrast** | Minimum 7:1 (WCAG AAA) | Presbyopia and low-light room |
| **QR code** | **28 × 28 mm minimum**, pure black on pure white, 4-module quiet zone | Below 25 mm, older phone cameras fail at arm's length. Never print a QR on a coloured or textured field. |

### 2.2 Deck-by-deck build

| Deck | Colour | Per table | For 10 tables | Locked until |
|---|---|---|---|---|
| **RED — Invoices** | Signal red header band | 10 | **100** | Live from minute 0 |
| **GREEN — AbsoluteCard controls** | Green header band | 6 | **60** | Phase C (unlocks after outage resolved) |
| **BLUE — Alliance & trade** | Blue header band | 4 | **40** | Phase B |
| **PRACTICE — tutorial** | Grey, marked "PRACTICE" | 1 | **10** | Pre-game |
| | | | **210 cards total** | |

Add **10% print overage → order 231 cards.** Cards get lost, bent and pocketed as souvenirs.

### 2.3 RED card — anatomy

Every red card carries the same six-block layout. This consistency is what makes the traps findable by *reading* rather than by *pattern-spotting the layout*.

```
┌──────────────────────────────────────────────┐
│ ▌ INVOICE                          T-03      │  ← owner table badge, top right
├──────────────────────────────────────────────┤
│                                              │
│  STANDARD B2B SUPPLY                         │  ← 22pt bold
│                                              │
│  COUNTERPARTY                                │
│  Meridian Logistics LLC (Mainland Dubai)     │  ← 16pt
│                                              │
│  AMOUNT      AED 486,200.00                  │
│  VAT         AED 23,152.38 @ 5%              │
│  FORMAT      PINT AE 1.0 (XML)               │  ← THE TELL is usually here
│  ROUTE       C1 → C3 → C4 → C2, reported C5  │  ← ...or here
│                                              │
│  ── TRANSMISSION RECORD ──────────────       │
│  • Supplier TRN: 100234567800003 — PRESENT   │  ← 14pt, 4 lines
│  • Buyer TRN: 100987654300003 — PRESENT      │
│  • Mandatory semantic fields: 51 of 51       │
│  • Issued 04 Jan 2027 · Transmitted 04 Jan   │
│                                              │
│                       ┌────────┐             │
│                       │  QR    │  RED-T03-V1 │  ← human-readable ID under QR
│                       └────────┘             │
└──────────────────────────────────────────────┘
```

**Critical print rules for RED cards:**

1. **No visual difference whatsoever between valid and invalid cards.** Same colour, same layout, same weight. The moment a designer "helpfully" tints the invalid ones, the game is over.
2. **The owner table badge (T-03) must be printed** — it is how facilitators re-sort 100 cards in 4 minutes at teardown, and how the trade negotiation works ("who has T-07's?").
3. **The human-readable card ID under the QR** is the fallback when a camera fails. A facilitator can key it in manually.
4. Do **not** print the verdict, the penalty or the explanation on the card. That is the platform's job, delivered as a teaching modal at the moment of the decision.

### 2.4 The six valid archetypes (V1–V6)

Full printed copy is in `card_manifest.csv` and `cards_seed.json`. Summary of what each teaches:

| Code | Card | Teaching point |
|---|---|---|
| **V1** | Standard B2B Supply | The clean baseline — 51/51 fields, both TRNs, full five-corner route |
| **V2** | Free Zone B2B Supply | **JAFZA is in scope.** There is no free-zone carve-out |
| **V3** | B2G Government Supply | Your phase governs your duty, not the buyer's later go-live date |
| **V4** | E-Credit Note | Credit notes carry the identical transmission obligation |
| **V5** | Export — Zero Rated | Zero VAT ≠ out of scope. It still routes and still reports |
| **V6** | Self-Billed Supply | Self-billing moves who generates, not whether you comply |

V1–V3 sit in the owner's folder. **V4, V5 and V6 are the traded cards** — they are the ones seeded to T+1, T+2, T+3.

### 2.5 The six defect archetypes (X1–X6) — the teaching payload

Each table receives **four of the six**, rotated by table index so all six appear across the room. This matters: the debrief asks "who had the DMCC card?" and hands go up at half the tables, which is more interesting than all of them.

| Code | Card | The trap | Penalty |
|---|---|---|---|
| **X1** | Scanned PDF Invoice | Looks like an invoice, is a picture of one | AED 100/doc |
| **X2** | Missing Buyer TRN | 50 of 51 fields. Feels like a rounding error. It is a rejection | AED 100/doc |
| **X3** | Direct Email Transmission | **The best card in the deck.** The XML is perfect and it is still non-compliant, because it bypassed corners 3, 4 and 5 | AED 100/doc |
| **X4** | No ASP Appointed | Not an invoice problem, an existence problem. Accrues whether or not you invoice | **AED 5,000/month** |
| **X5** | Free Zone "Exempt" Stamp | The document confidently asserts an exemption that does not exist | AED 100/doc |
| **X6** | B2C Retail Sale | **The reverse trap.** Genuinely out of scope. Punishes teams that file on reflex | AED 0 |

> **X3 and X6 are the two cards the MC should name in the debrief.** X3 proves that format compliance is not route compliance. X6 proves that compliance is classification, not volume. Together they dismantle the "we'll just submit everything" position that half the room walks in holding.

### 2.6 GREEN deck — the Kamel Pay payload

Locked until Phase C. This is deliberate: teams spend 40 minutes doing it manually and badly, *then* get the tool. The relief is the sales argument.

| Code | Card | In-game effect |
|---|---|---|
| **GRN-01** | Deploy P.R.O. Card | Permanent immunity to the AED 5,000/month implementation penalty. +25,000 |
| **GRN-02** | Deploy C-Suite Card | +30,000, unlocks a bonus travel transaction worth +20,000 |
| **GRN-03** | Set Daily Transaction Limit | Caps every future penalty at AED 10,000. +15,000 |
| **GRN-04** | **AI-OCR Receipt Matching** | **Instantly files every remaining valid invoice at full value and quarantines every invalid one at zero penalty** |
| **GRN-05** | Consolidate Virtual IBANs | File one foreign invoice without trading it. +20,000 |
| **GRN-06** | Continuous Ledger Close | Doubles all capital earned in the final 5 minutes |

**GRN-04 is the entire commercial thesis expressed as a game mechanic.** A team that plays it watches the machine make, in two seconds and without error, every decision they have been agonising over for forty minutes. Print it slightly heavier if you print anything differently — but do not label it as special.

### 2.7 BLUE deck — negotiation currency

| Code | Card | Requires |
|---|---|---|
| **BLU-01** | Consolidate Entity | Another table's agreement. Both file all foreign cards held for each other. +40,000 each |
| **BLU-02** | WPS Payroll Sync | Playable alone. +35,000, immunity to the Payroll Shock event |
| **BLU-03** | ASP Fast-Track | Another table's agreement. Validate a trade from your seat, no queue. +10,000 each |
| **BLU-04** | Mutual Recognition Pact | Another table's agreement. Next trade between this pair pays double |

Three of the four blue cards are **worthless without a counterparty who says yes.** That is the point. The Alliance Builder badge is won here.

---

## 3. THE TRANSACTION LEDGER BOARD

**Quantity:** 1 per table (10) · **Size:** A2 landscape, 594 × 420 mm
**Material:** 2 mm heavy-weight vinyl mat, matte, anti-slip backing
*(Vinyl, not paper. Paper mats curl within 20 minutes and slide off tablecloths.)*

### 3.1 Layout

```
╔══════════════════════════════════════════════════════════════════════╗
║  TABLE ⬤ T-03            THE TRANSACTION LEDGER          Q1 2027     ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ①  SUPPLIER  ────────────▶  ③  SUPPLIER ASP  ──────────┐          ║
║      (red node)                  (green node)             │          ║
║                                        │                  ▼          ║
║                                        │           ⑤   FTA           ║
║                                        │        (violet, centre)     ║
║                                        ▼                  ▲          ║
║   ②  BUYER     ◀────────────  ④  BUYER ASP     ──────────┘          ║
║      (blue node)                 (orange node)                       ║
║                                                                      ║
║  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐            ║
║  │ PENDING        │ │ FILED          │ │ FTA            │            ║
║  │ INVOICES       │ │ & CLEARED      │ │ QUARANTINE     │            ║
║  │                │ │                │ │                │            ║
║  │ [card slot]    │ │ [card slot]    │ │ [card slot]    │            ║
║  └────────────────┘ └────────────────┘ └────────────────┘            ║
║                                                                      ║
║  ┌──────────────────────────┐  ┌──────────────────────────┐          ║
║  │ HELD FOR OTHER TABLES    │  │ CONTROLS DEPLOYED        │          ║
║  │ (foreign invoices)       │  │ (green cards played)     │          ║
║  └──────────────────────────┘  └──────────────────────────┘          ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 3.2 Design notes

- **The five nodes are 70 mm circles** with the corner number set at 40pt inside. The routing arrows between them are the single most-referenced piece of art in the room — this diagram *is* the outage puzzle answer, hiding in plain sight on every table.
- **Card slots are printed outlines 95 × 145 mm** (5 mm larger than the card) with a 2 mm dashed rule. Do not use pockets or sleeves — executives will not fight with a pocket.
- **"HELD FOR OTHER TABLES" is the most important zone on the board.** Physically separating foreign cards from own cards is what makes the trade negotiation legible when someone walks up mid-game.
- Colour the nodes exactly as specified: C1 red, C2 blue, C3 green, C4 orange, C5 violet. The platform's UI uses the same five colours, so the mat and the phone speak the same visual language.
- Print the table number **large, top-left, 60pt** — visible from across the room when a Procurement lead is hunting for T-07.

---

## 4. LAMINATED REFERENCE SHEETS

**Quantity:** **3 per table (30 total)** — not 2. Five people around a table, two sheets, and the Tax Director hoards both. Three ends the argument.
**Size:** A4, double-sided · **Material:** 250gsm card, 125-micron gloss-free matte laminate, rounded corners

### 4.1 SIDE A — THE COMPLIANCE DIRECTIVE

**Block 1 — The Five-Corner Route** *(top half, the hero graphic)*
Same diagram as the board, larger. Arrows labelled with what travels along each: `structured PINT AE XML`, `validated + reported`, `near real-time`.

**Block 2 — Phase Timeline**

| Phase | Who | Appoint ASP by | Go-live |
|---|---|---|---|
| **Pilot** | Voluntary early adopters | — | 1 July 2026 (open) |
| **Phase 1** | Revenue ≥ AED 50M | **30 October 2026** | **1 January 2027** |
| **Phase 2** | Revenue < AED 50M | 31 March 2027 | 1 July 2027 |
| **Phase 3** | Government entities | 31 March 2027 | 1 October 2027 |

**Block 3 — What Counts As An E-Invoice**

> ✅ Structured **PINT AE** XML, transmitted through Accredited Service Providers, reported to the FTA
> ❌ PDF · scanned image · emailed document · paper original · Word file · "we have a portal"

**Block 4 — Field Requirements**

> **51** mandatory semantic fields — electronic **tax** invoice
> **49** mandatory semantic fields — commercial e-invoice
> 50 of 51 is a rejection, not a rounding error.

**Block 5 — Scope: In or Out** *(the two facts that win the game)*

| In scope | Out of scope |
|---|---|
| All B2B transactions | B2C — until a further Ministerial Decision |
| All B2G transactions | Certain VAT-exempt financial services (Art. 42) |
| **All free zones** — JAFZA, DMCC, IFZA, RAKEZ, ADGM, DIFC | |
| Designated zones | |
| Non-VAT-registered entities issuing B2B/B2G | |

> The trigger is the **transaction type**, not the entity's location or VAT status.

### 4.2 SIDE B — THE RISK REGISTER

**Block 1 — Cabinet Decision No. 106 of 2025**

| Violation | Penalty |
|---|---|
| Failure to implement the system / appoint an ASP | **AED 5,000 per month**, or part thereof, until remedied |
| Failure to issue or transmit an e-invoice or e-credit note | **AED 100 per document**, capped AED 5,000/month |
| Failure to notify the FTA of a system failure or registration change | **AED 1,000 per day** of delay |

**Block 2 — Manual vs Embedded Control** *(the commercial frame, presented as neutral comparison)*

| | Traditional corporate card | Smart corporate spend platform |
|---|---|---|
| Control point | After the spend, at reconciliation | At authorisation, before the spend |
| Receipt capture | Chase the employee | Captured at point of sale, OCR-matched |
| Policy enforcement | A PDF policy nobody reads | Category and limit rules on the card |
| Multi-entity view | One statement per entity | One portal, virtual IBAN per entity |
| Ledger close | 3–5 day month-end scramble | Continuous |
| Under a real-time regime | Retrospective by design | Real-time by design |

**Block 3 — The Two Deadlines That Matter Today**
Large, high-contrast, bottom of the sheet:
> **30 OCT 2026** — appoint your ASP  ·  **1 JAN 2027** — mandatory go-live
> *(Phase 1, revenue ≥ AED 50M)*

---

## 5. IDENTITY & ACCESS PRINTOUTS

### 5.1 Role cards / lanyard inserts

**Quantity:** 5 per table (50) + 10 spares = **60**
**Size:** 95 × 60 mm, portrait lanyard insert, 300gsm

Five roles, each in its own colour, each printed with its one-line job:

| Role | Colour | Printed instruction | Device |
|---|---|---|---|
| **CFO** | Violet | "You hold the ledger. You are the only one who sees the money and the clock. You decide nothing alone." | Required |
| **TAX & COMPLIANCE DIRECTOR** | Red | "You are the only person who can scan. Read every invoice before you do." | Required |
| **CIO** | Orange | "Nothing will happen to you for 40 minutes. Then everything will." | Required |
| **PROCUREMENT LEAD** | Green | "You will leave this table. Three other tables hold what you need." | Optional |
| **OPERATIONS LEAD** | Blue | "You run to the ASP Station. Nothing clears without you." | Optional |

> The CIO card's line is the best joke in the pack and buys you a genuinely engaged CIO at minute 40.

### 5.2 Table PIN cards

**Quantity:** 6 per table (60) — 5 for players, 1 held by the roaming facilitator for re-auth
**Size:** 90 × 140 mm, same stock as game cards

> **⚠ Print dependency.** PINs and join URLs come from `table_pins.csv`, generated by `generate_cards.py --pin-seed <seed>`. The platform seeds the identical values. **The production domain must be fixed before this item goes to print** — it is baked into the QR. Record the pin-seed used; regenerating with a different one after printing means nobody can log in on the day.

Front: table number 100pt · **6-character PIN, 48pt, unambiguous character set (no O/0, I/1, S/5, B/8, Z/2)** · large join QR
Back: the four-step join instruction in 18pt.

```
      TABLE 03
      ┌──────────────┐
      │              │
      │   JOIN QR    │
      │              │
      └──────────────┘
      PIN:  K7M4XR
```

> **No PII, ever.** Teams are "Table 03". Players are roles. Nothing on this card, in the app, or in the database identifies a human being. Say this out loud during the opening — a room of compliance officers will notice, and it is the single fastest way to get 50 executives to actually connect.

### 5.3 Table tents

**Quantity:** 10 · **Size:** A5 tent, 350gsm, 4-sided visible

Table number at 200pt on all four faces. Sounds excessive. It is not — at minute 20 you have twenty executives navigating a dark ballroom looking for "table seven".

### 5.4 Outage envelopes

**Quantity:** 10 sealed A6 envelopes, one per table, placed on the board face-down at setup and marked:

> **DO NOT OPEN UNTIL INSTRUCTED**

Inside: the fallback outage code and a printed hint pointing at the five-corner route diagram. Facilitators hand these out only if a table is still stuck 90 seconds into the outage, so that no table sits in a losing state losing capital for three minutes while its neighbours celebrate.

---

## 6. ROOM & STATION LOGISTICS

### 6.1 ASP Stations

**Quantity: 2** for 10 tables. One is a queue disaster, three is under-used.
Place them at **opposite ends** of the room so the ring topology maps onto physical distance and nobody has a 2-metre advantage.

Each station needs:

- A2 foamboard sign: **"ACCREDITED SERVICE PROVIDER — CORNER 3 / CORNER 4"** with the routing diagram
- 1 facilitator with a charged, tethered device running the ASP validation screen
- A printed copy of `trade_matrix.csv`
- A stack of spare PIN cards
- A power bank

**Validation ritual (this is the theatre, do not shortcut it):** both tables' Operations Leads present both PIN cards and the traded invoice card. The facilitator scans all three. The screen shows the routing animation C1 → C3 → C4 → C2 with the FTA report firing. It takes eight seconds and it is the moment the five-corner model stops being a slide.

### 6.2 Full print & materials checklist (10 tables)

| # | Item | Qty | Spec |
|---|---|---|---|
| 1 | Red invoice cards | 100 (+10) | 90×140mm, 350gsm, matte lam, QR 28mm |
| 2 | Green AbsoluteCard cards | 60 (+6) | as above |
| 3 | Blue alliance cards | 40 (+4) | as above |
| 4 | Practice cards | 10 (+5) | as above, grey, marked PRACTICE |
| 5 | Transaction Ledger mats | 10 (+1) | A2, 2mm vinyl, matte, anti-slip |
| 6 | Laminated reference sheets | 30 (+4) | A4 double-sided, 250gsm + matte laminate |
| 7 | Role lanyard inserts | 60 | 95×60mm, 5 colourways |
| 8 | Lanyards | 60 | plain, no branding conflict |
| 9 | Table PIN cards | 60 | 90×140mm, unique PIN per table |
| 10 | Table tents | 10 | A5, 4-face, 200pt numerals |
| 11 | Invoice folders | 10 | A5 manila, printed "PENDING — Q1 2027" |
| 12 | Quarantine trays | 10 | A5 card tray, printed "FTA QUARANTINE" |
| 13 | Outage envelopes | 10 | A6, sealed, "DO NOT OPEN" |
| 14 | ASP Station signage | 2 | A2 foamboard on easel |
| 15 | ASP Station device + charger | 2 | tablet preferred, tethered |
| 16 | Facilitator trade matrix | 4 | A4, printed, one per facilitator |
| 17 | Projection screen | 1 | 16:9, leaderboard visible from every seat |
| 18 | Spare phone chargers | 10 | mixed Lightning / USB-C, one per table |
| 19 | CTA cards (debrief) | 60 | 90×140mm, QR to the assessment booking page |
| 20 | Reset sort trays | 10 | labelled T-01…T-10 for teardown |

**Item 20 is the one everyone forgets.** After the event you have 210 loose cards. The owner-table badge printed on each card plus ten labelled trays turns a 40-minute sort into a 4-minute one — and this pack is designed to be re-run.

### 6.3 Room layout requirements

- **Round tables of 5**, ring order T-01 → T-10 clockwise, T-01 adjacent to T-10
- **1.5 m minimum clearance** between tables. Twenty executives will be walking simultaneously in Phase B, several of them briskly.
- **ASP Stations at opposite ends**, unobstructed approach from both
- **Projection screen** visible from every seat without turning a chair
- **Lighting up, not down.** No conference-dim. This audience is reading 14pt detail lines on paper.
- **Wi-Fi:** dedicated SSID, no captive portal, no password-on-a-slide. Test with 50 concurrent devices *the day before*, not on the morning.

---

## 7. THE BUILD SCHEDULE

| When | What |
|---|---|
| **T−21 days** | Approve card copy from `card_manifest.csv`. Copy is the long pole — the legal content must be signed off before anything goes to print. |
| **T−14 days** | Artwork to print. Proof one of each red archetype and **scan-test the QR at arm's length under venue-like lighting** before the full run. |
| **T−7 days** | Full print delivered. Platform staged with `cards_seed.json`. |
| **T−3 days** | **Full dry run with 5 real people** who have not seen the game. This is where you discover that the Tax Director cannot find X3, or that the outage puzzle is too easy. |
| **T−1 day** | Room set. Wi-Fi load-tested. Cards sorted into folders by table. Boards laid. Envelopes sealed and placed. |
| **T−0, 06:30** | Facilitator briefing. Every station device charged and logged in. |

---

## 8. WHAT THIS PACK DELIBERATELY DOES NOT DO

Worth stating for the proposal, because each is a decision rather than an omission:

- **No dice, no spinners, no tokens, no play money.** Every prop is a document, a card or a control. Nothing on the table would look out of place in a boardroom, which is what lets a 62-year-old CFO participate without feeling patronised.
- **No visual tell on invalid cards.** The difficulty lives entirely in the reading.
- **No scoring on the physical cards.** The board never contradicts the platform, and you can rebalance the economy the night before without a reprint.
- **No names anywhere.** No PII on any printed item, in keeping with the platform constraint.

---

*Regulatory content verified against current UAE Ministry of Finance and FTA guidance, Cabinet Decision No. 106 of 2025, and Ministerial Decision No. 243 of 2025 as at July 2026. Re-verify the 51/49 field counts and Phase 1 dates at T−21 days before print sign-off — this framework is still moving.*
