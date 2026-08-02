# SLIDE DESIGN BRIEF — Five-Corner Compliance Simulation

**How to use this:** paste this entire document into Claude (Claude Design / Claude with artifact canvas). It asks for nothing back — build the slides as one 16:9 deck (or two decks if you prefer: "PLAYER" + "OPERATOR"). All copy, numbers, timings and rules below are authoritative — do not invent or change values.

---

## CONTEXT (what this product is)

A one-day UAE e-invoicing compliance workshop game. ~50 executives (ages 45–70, finance audience) sit at 10 tables of 5. Each table is a "company" starting with AED 1,000,000. Physical invoice cards are dealt around the room; players scan a QR on each card with their phone, read the invoice, and decide **FILE** (compliant) or **QUARANTINE** (red flag). The platform scores in real AED, explains the regulation after every decision, and the game self-drives its phases. **The pedagogy: valid and invalid invoices look identical — you must READ them, not match colors.**

Two slide decks are required:

- **DECK A — PARTICIPANT OPENING (10 min):** what the room watches before play. Teaches UAE e-invoicing foundations so the game makes sense.
- **DECK B — OPERATOR RUN DECK (live, during the event):** the idiot-proof A-to-Z script any first-time facilitator follows to run the whole game. This is a *run script*, not a lecture — every slide says what to DO right now, what to watch, and which console button to press.

---

## DESIGN SYSTEM (apply to both decks)

- **Palette:** primary indigo `#5F59F7`, CTA blue `#0059F7`, ink `#000D1E`, surface `#F4F6FB`, white `#FFFFFF`, signal red `#D64550`, gold `#C9A227` (only for the "golden rule" accents). Dark ink slides for openers/closers, light for content ("sandwich").
- **Type:** Raleway for display, Open Sans for body (fallback safe fonts: Calibri/Arial). Titles 36–44pt, body 14–16pt, **never below 14pt** — audience is 45–70.
- **Mood:** Apple-style elegance — generous whitespace, one idea per slide, big numbers, no clutter.
- **Hard rules:**
  1. **Never imply card validity by color.** The whole game hinges on valid/invalid being indistinguishable. No green=good / red=bad card coding anywhere in the decks.
  2. **Color is never the only signal** — every state carries an icon AND a word.
  3. No invented figures. Every AED value, timing and rule below is fixed.
  4. Deck header bands on cards are *sorting aids* labeled INVOICE / CONTROL / ALLIANCE / PRACTICE — never validity markers.
- **Every slide gets speaker notes** (the MC/facilitator reads them verbatim if needed).

---

# DECK A — PARTICIPANT OPENING (12 slides, ~10 min)

**Slide A1 — Title (dark ink)**
- Kicker: FIVE-CORNER COMPLIANCE SIMULATION
- Title: **E-Invoicing in the UAE**
- Sub: "The foundations you'll play with today — 10 minutes, no jargon."
- Visual: a card with a QR block + the loop READ → DECIDE → FILE OR QUARANTINE → LEARN
- Notes: "Welcome. In the next hour you'll run a company through the UAE e-invoicing regime. This is what you need to know first."

**Slide A2 — The paper invoice is done (3 stat cards)**
- MANDATE: "B2B e-invoicing is now the law in the UAE."
- THE FORMAT: "PINT AE XML — one machine-readable standard the FTA validates automatically."
- THE STAKES: "Non-compliance carries financial penalties (Cabinet Decision No. 106 of 2025)."
- Notes: "PDFs, email and paper are out. Structured electronic invoices are in."

**Slide A3 — Six things a compliant e-invoice must have (2×3 grid)**
1. PINT AE XML format — structured, machine-readable, not a PDF
2. Both TRNs present — supplier's and buyer's VAT registration numbers
3. All 51 mandatory fields populated — dates, parties, line items, tax codes, totals
4. Routed via an ASP — an Accredited Service Provider
5. Reported near real time — to the FTA as it happens
6. Tamper-evident — unmodified and provably intact
- Notes: "This is the checklist. You'll be applying it to every card."

**Slide A4 — Two numbers make or break an invoice**
- TRN (big): "Tax Registration Number — the VAT identity of each party. Missing or malformed on either side = red flag."
- 51 (huge stat): "mandatory fields. A blank mandatory field is a compliance failure — quarantine it."
- Notes: "When in doubt, check the TRNs first."

**Slide A5 — PINT AE XML (code card, dark)**
- Show a small XML sample: `<Invoice>` with `<TRN>`, `<BuyerTRN>`, `<LineItems>`, `<TaxTotals>`.
- Caption: "XML = data a machine can read, validate and audit. If it isn't PINT AE XML, it isn't an e-invoice."
- Notes: "You don't need to read XML — you need to recognize when it's NOT there."

**Slide A6 — The ASP channel (3-box flow)**
- SELLER → ASP → FTA, with arrows. ASP box highlighted indigo.
- Caption: "Every invoice travels through an Accredited Service Provider. No ASP routing, or 'direct email' transmission? The FTA never saw the invoice — that is a compliance failure."
- Notes: "This is the five-corner model: Seller, Buyer, ASP, FTA — and the invoice itself."

**Slide A7 — Red flags: quarantine these (checklist)**
- Missing or malformed TRN — either side
- Blank mandatory fields
- PDF / email / non-XML invoice
- No ASP routing or direct-email transmission
- Credit note without the original invoice reference
- Amounts inconsistent with the line items
- Notes: "One red flag = quarantine. You can always file later after review — you cannot unfile a bad decision."

**Slide A8 — The stakes (3 penalty cards)**
- FILING A BAD INVOICE → immediate fine
- QUARANTINING A GOOD ONE → lost revenue + fine
- OUTAGES → "−1,000 AED every 10 seconds until your CIO fixes the system"
- Notes: "Real money, real pressure. That's the game."

**Slide A9 — Your loop (4-step process flow)**
1. SCAN — phone reads the QR (or type the card ID)
2. READ — check the six points
3. DECIDE — FILE it or QUARANTINE it
4. LEARN — the platform shows the verdict + the regulation
- Caption: "Correct decisions earn AED. Wrong ones cost AED. Your table's capital is the scoreboard."
- Notes: "Every decision comes back with the regulation explained. That's where the learning lands."

**Slide A10 — The golden rule (dark ink, gold accent)**
- Title: **Valid and invalid cards look identical.**
- Body: "You cannot spot them by colour or design — only by reading. That is the training."
- CTA card: "Every decision comes back with the regulation explained. You leave the room knowing e-invoicing."
- Notes: "Do not trust the card's look. Trust the invoice's content."

**Slide A11 — How to join (practical, shown during LOBBY)**
- "1. Open the link on your phone. 2. Enter your table number + table PIN. 3. Claim your role: CFO, Tax & Compliance, CIO, OPS, Procurement. 4. One phone can claim ALL roles — a full table is not required."
- Visual: phone mock with the join screen; the PIN pad.
- Notes: "Facilitator: show this while people join. Target: every table with at least 3 devices."

**Slide A12 — Closing: the challenge (dark)**
- Title: "Ten companies. One million AED each. One hour. Who runs the most compliant ledger?"
- Sub: "The room's live leaderboard decides."
- Notes: "Hand over to the facilitator. The clock starts."

---

# DECK B — OPERATOR RUN DECK (live A-to-Z script, ~16 slides)

**Purpose:** a first-time facilitator follows this deck top-to-bottom. Each slide = a moment in the event with exact actions. Timings assume **Event Mode ON** (the platform self-advances and announces every phase); the "Manual override" notes cover the fallback. Total Event Mode runtime: **TUTORIAL 3 min → A 15 min → B 25 min → C 20 min → FROZEN** (63 min).

**Slide B1 — Title / "You run the room. The platform carries the mechanics."**
- Notes: "Read this deck top to bottom during the event. When in doubt: the platform auto-advances; you only pause, rescue, or skip."

**Slide B2 — T−30 min: Setup checklist (before anyone arrives)**
- Projection up at `…/projection`; console open at `…/console` (PIN on the console screen)
- **Reset game** (console → Reset game, reason "pre-event reset") → phase shows LOBBY
- **Set Active tables** to real headcount (3–10)
- Hand each table its envelope: table tent (PIN + join link), card deck, how-to-play card
- Check the leaderboard shows 10 tables at 1,000,000
- Notes: "Five minutes. If the console shows LOBBY and all tables at 1,000,000, you're set."

**Slide B3 — 09:00 · LOBBY (10 min) — get everyone in**
- Announce: "Open the link, enter your table number + PIN, claim your roles."
- Walk the room: every table needs ≥3 devices. Watch **Red flags** on the console for stragglers.
- Fewer than 5? One phone claims ALL roles.
- Console action: none yet. LOBBY is join time.
- Notes: "Do not start the clock until every table has at least 3 devices or you've accepted the stragglers."

**Slide B4 — TUTORIAL (3 min) — the practice round**
- Console action: **press TUTORIAL** (reason: "practice round").
- One practice scan on every table (a known-good card). Confirm the WHY modal appears on their phones.
- When everyone's done → **press A** (reason: "practice done").
- Notes: "This is your only rehearsal. If a WHY modal doesn't appear, fix it NOW."

**Slide B5 — Phase A · Internal Audit (15 min) — the race**
- Announce: "Audit your inbox. Read every invoice. FILE the compliant, QUARANTINE the traps."
- Walk the room; encourage volume, not perfection. Idle table >3 min → nudge.
- **Do not touch capital** unless a real failure happened (phone died mid-scan → Adjust).
- Watch: red flags, scan errors, stuck phones.
- Notes: "Event Mode auto-advances to B at 15:00 — it will announce. You don't need to watch the clock."

**Slide B6 — Phase B · Trading opens (25 min)**
- Announce: "Procurement: foreign invoices are sitting on other tables. Find them, bring them to the ASP."
- You are the ASP: **trade validation panel** — type Card ID, From table, To table (owner), Validate. Both tables +5,000.
- Keep a short queue; validate as they arrive. The platform shows the compliance verdict on screen.
- Watch: trades arriving, wrong-owner mistakes (the platform rejects them — tell the table why).
- Notes: "The trade ritual is the theatre: both Ops leads present, you validate, the screen shows the routing animation."

**Slide B7 — Phase C · Outages + control cards (20 min)**
- Announce: "Outages are striking. CIOs: fix your systems."
- Outages arm automatically on the stagger schedule; each unresolved outage drains −1,000/10s (cap −150k).
- CIOs solve by answering the outage question; green CONTROL cards unlock once resolved.
- Force-resolve only if a table is genuinely stuck.
- Watch: the 150k cap; a table bleeding hard may need help.
- Notes: "Event Mode announces the outage phase. You're the safety net, not the hero."

**Slide B8 — FROZEN → leaderboard locks**
- Console action: the platform freezes automatically at end of C (or **press FROZEN** manually, reason "end game").
- Show the projection: **winner = highest compliant capital**.
- Announce the top 3 with their badges.
- Notes: "Capital is frozen. Nothing you do now changes the score."

**Slide B9 — DEBRIEF (5 min) — the commercial close**
- Console action: **press DEBRIEF** (reason: "debrief").
- Open the **Debrief screen** (console header link): total fines levied, X3 direct-email invoices wrongly filed, GRN-04 time-to-close comparison.
- The line: "You just did, under pressure, what a compliant e-invoicing pipeline does every day: read, decide, transmit, verify."
- Point the room to the assessment link (debrief card QR → `/book`).
- Notes: "This is the sell. The room's own numbers prove the EPPA story."

**Slide B10 — Emergency playbook (reference table — leave visible)**
- Phone dies → reopen, state restores; else new join, same PIN
- Table stuck / outage won't clear → Force-resolve outage (console)
- Wrong penalty applied → Adjust capital (console)
- Camera fails everywhere → "Enter card ID" manual path — game continues
- Room chaos → **PAUSE ALL**, fix, **Resume**
- Game must end NOW → **Kill switch** (locks the leaderboard)
- Full restart → **Reset game** (only from FROZEN/LOBBY)
- Notes: "Every console action asks for an audit reason — type it. It's the event's audit trail."

**Slide B11 — Golden rules for the operator**
- Never hand out card verdicts — let the platform teach (the WHY modal is the learning).
- The cards look identical — don't spoil it.
- Colour is never the only signal — use the words on the console.
- When in doubt: pause, look, resume.
- Notes: "Your job is the room, not the verdicts."

**Slides B12–B16 — optional appendices (facilitator may skip during event):**
- B12: The console explained (every section, one line each: Game ops, Phase control, Active tables, Red flags, Tables, ASP panel, Debrief link)
- B13: Scoring cheat-sheet (FILE valid own +50k · QUARANTINE invalid +10k · wrong FILE −penalty · wrong QUARANTINE −25k · trade +5k both · outage −1k/10s)
- B14: The trade ring explained (why 3 of your valid invoices sit on other tables)
- B15: Outage mechanics detail (stagger schedule, solve question, green unlock, 150k cap)
- B16: Badges (CLEAN_CLOSE, CRISIS_MANAGER — how each is earned)

---

## FORMAT & DELIVERY

- One HTML artifact, 16:9, print-friendly to PDF. Two visual sections: "PLAYER" (A1–A12) and "OPERATOR" (B1–B16), each with its own title slide.
- Speaker notes under every slide (or a notes field).
- Palette and type as specified; dark opener/closer; icon + word everywhere; no validity color-coding.
- Deliver as: interactive preview + downloadable PDF + slide-by-slide copy.
