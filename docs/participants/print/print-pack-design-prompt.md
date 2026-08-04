# PRINT PACK — MASTER PROMPT FOR CLAUDE DESIGN (KamelPay visual language)

**How to use:** paste everything below the line into Claude Design, and attach `table_join_codes.csv` and `trade_matrix.csv` from the same folder. The prompt is self-contained — you do not need to know anything about the workshop, and you must not ask. Everything you may print is specified below. Nothing else.

---

You are a print designer. You will design and render the complete **printed kit** for a one-day facilitated workshop exercise on electronic invoicing compliance, run for ~50 senior finance executives (ages 45–70) at 10 round tables of 5, using personal phones plus printed table materials.

This brief covers **13 printed items**. Every item is fully specified below: quantity, size, material, layout, and exact copy. Render each item **EXACTLY as specified** — no more, no less. Do not add, remove, reorder, or "improve" any word, number or value. Do not invent copy. Where a value is a placeholder (marked `[LIKE THIS]`), render the placeholder visibly on the item and flag the file as **replace-before-print** in your handoff notes.

## Visual language (the "KamelPay" system — apply to every item)

- **Palette:** ink `#0A1628` · navy `#12305A` · signal blue `#1A7AE5` · signal-deep `#0D5BB5` · heat orange `#F07A00` · heat-deep `#C45F00` · paper `#F4F7FB` · mist `#E4ECF6` · white `#FFFFFF` · muted `#5A6B82`. Accent greens/reds/violets are reserved for the five routing nodes (specified below) and the role colours — do not use them anywhere else.
- **Type:** Outfit for display (titles, numerals), Source Sans 3 for body, IBM Plex Mono for metadata (labels, codes, IDs). Load from Google Fonts; embed for print.
- **Aesthetic:** premium, confident, editorial — like the identity of a serious financial product. Deep navy + warm orange accents on clean white/paper. Generous whitespace, hairline rules, small mono labels. The kit must read as high-end boardroom material — never like a toy, never like a flashcard.
- **Print standard, all items:** 300 dpi final export, 3 mm bleed all round, crop marks on sheets, matte laminate finish (gloss creates glare under venue lighting and defeats phone scanning). Rich RGB for digital print; supply CMYK separation notes for offset if requested.
- **Legibility floor:** body text **never below 16 pt** on 90 × 140 mm cards and A5 items; **never below 14 pt** on A4 and A2 items; numerals for table numbers at the sizes specified. Contrast minimum **7:1 (WCAG AAA)** on every text/background pair. The audience reads in ambient light at arm's length.
- **Rounded corners:** 3 mm on every card and sheet that is handled.

## Hard rules (non-negotiable)

1. **Color is decoration, never information.** Nothing in this kit may imply "good" or "bad", "correct" or "incorrect", "compliant" or "non-compliant". No green-for-ok, no red-for-error, no checkmarks or crosses on any item. (The routing nodes and role colours below are identity colours, not verdicts.)
2. **Color is never the only signal.** Every state carries an icon **and** a word.
3. **No PII anywhere.** No names, emails, phone numbers, or personal data on any item. Companies are "Table 01"–"Table 10"; people are roles.
4. **Real QR codes only.** Every QR must be generated from its exact payload string — never a placeholder pattern or decoration. **Pure black modules on pure white**, 4-module quiet zone, no logo overlay, no tinting. Verify scannability before delivery (spot-check at least 5 with a phone at arm's length).
5. **Never invent data.** Every value comes from this brief or the attached CSVs. Empty cells = omit the element.

## The Routing Diagram (the hero graphic — used on Items 2, 3, 5, 11)

Five nodes, each a **70 mm circle** with its corner number set at **40 pt** inside, labelled with the corner name in small caps beneath:

| Node | Corner | Colour | Label |
|---|---|---|---|
| C1 | ① | **Red** | SUPPLIER |
| C2 | ② | **Blue** | BUYER |
| C3 | ③ | **Green** | SUPPLIER ASP |
| C4 | ④ | **Orange** | BUYER ASP |
| C5 | ⑤ | **Violet** | FTA |

Layout (read left to right, top to bottom): C1 top-left → C3 top-centre → C5 centre-right → C4 bottom-centre → C2 bottom-left → back to C1, forming a closed ring of arrows. Arrows are labelled with what travels along each leg: **"structured PINT AE XML"** (C1→C3), **"validated + reported"** (C3→C5 and C5→C4), **"near real-time"** (C4→C2 and C2→C1). This exact diagram must be visually identical wherever it appears. It is the single most-referenced piece of art in the room.

---

## ITEM 1 — Table PIN / join cards
**Quantity:** 60 (6 per table: 5 players + 1 facilitator spare) · **Size:** 90 × 140 mm, double-sided, same stock and finish as a premium card (350 gsm, matte lam) · **Data:** from the attached `table_join_codes.csv` (columns: `table_no`, `pin`, `join_url`) — render **every row**, exactly as written. The values are final; the join URL is baked into the QR.

**Front:**
- Table number, e.g. `TABLE 03` — Outfit 800, **100 pt**, ink, top half
- **6-character PIN** — Outfit 700, **48 pt**, ink, unambiguous character set as given (no O/0, I/1, S/5, B/8, Z/2)
- **Join QR** — 28 × 28 mm minimum, inside the standard white chip panel (white background, 1 px navy frame, small corner brackets in heat orange), encoding exactly the `join_url` value
- Small mono caption under the QR: the `pin` value again, 10 pt IBM Plex Mono
- Card ID in the bleed margin only (cut away), never on the face

**Back:** the four-step join instruction in **18 pt**, numbered, with a small phone icon:
1. Open your phone camera and scan the QR on the front — or enter the PIN at the join page.
2. Claim a role for your company. Five roles, one per player.
3. You are in. Keep this card — you will re-authenticate with the PIN if your phone disconnects.
4. Wait for the facilitator. Play begins with a short tutorial.
*(Draft copy — the organizer may edit. Layout is final.)*

---

## ITEM 2 — Laminated reference sheets
**Quantity:** 30 (3 per table) · **Size:** A4, double-sided, 250 gsm card + 125-micron gloss-free matte laminate, rounded corners.

### SIDE A — THE COMPLIANCE DIRECTIVE
**Block 1 — The Five-Corner Route** *(top half, hero graphic):* the Routing Diagram, larger, with the three arrow labels.

**Block 2 — Phase Timeline** (table, all rows verbatim):

| Phase | Who | Appoint ASP by | Go-live |
|---|---|---|---|
| Pilot | Voluntary early adopters | — | 1 July 2026 (open) |
| Phase 1 | Revenue ≥ AED 50M | 30 October 2026 | 1 January 2027 |
| Phase 2 | Revenue < AED 50M | 31 March 2027 | 1 July 2027 |
| Phase 3 | Government entities | 31 March 2027 | 1 October 2027 |

**Block 3 — What Counts As An E-Invoice:**
> ✅ Structured **PINT AE** XML, transmitted through Accredited Service Providers, reported to the FTA
> ❌ PDF · scanned image · emailed document · paper original · Word file · "we have a portal"

**Block 4 — Field Requirements:**
> **51** mandatory semantic fields — electronic **tax** invoice
> **49** mandatory semantic fields — commercial e-invoice
> 50 of 51 is a rejection, not a rounding error.

**Block 5 — Scope: In or Out:**

| In scope | Out of scope |
|---|---|
| All B2B transactions | B2C — until a further Ministerial Decision |
| All B2G transactions | Certain VAT-exempt financial services (Art. 42) |
| **All free zones** — JAFZA, DMCC, IFZA, RAKEZ, ADGM, DIFC | |
| Designated zones | |
| Non-VAT-registered entities issuing B2B/B2G | |

> The trigger is the **transaction type**, not the entity's location or VAT status.

### SIDE B — THE RISK REGISTER
**Block 1 — Cabinet Decision No. 106 of 2025** (table, all rows verbatim):

| Violation | Penalty |
|---|---|
| Failure to implement the system / appoint an ASP | **AED 5,000 per month**, or part thereof, until remedied |
| Failure to issue or transmit an e-invoice or e-credit note | **AED 100 per document**, capped AED 5,000/month |
| Failure to notify the FTA of a system failure or registration change | **AED 1,000 per day** of delay |

**Block 2 — Manual vs Embedded Control** (presented as a neutral comparison):

| | Traditional corporate card | Smart corporate spend platform |
|---|---|---|
| Control point | After the spend, at reconciliation | At authorisation, before the spend |
| Receipt capture | Chase the employee | Captured at point of sale, OCR-matched |
| Policy enforcement | A PDF policy nobody reads | Category and limit rules on the card |
| Multi-entity view | One statement per entity | One portal, virtual IBAN per entity |
| Ledger close | 3–5 day month-end scramble | Continuous |
| Under a real-time regime | Retrospective by design | Real-time by design |

**Block 3 — The Two Deadlines That Matter Today** (large, high-contrast, bottom of the sheet):
> **30 OCT 2026** — appoint your ASP  ·  **1 JAN 2027** — mandatory go-live
> *(Phase 1, revenue ≥ AED 50M)*

---

## ITEM 3 — How-to-play guide
**Quantity:** 10 (1 per table) · **Size:** A5, double-sided, 250 gsm + matte lam, rounded corners. You may condense typographically (columns, hierarchy, tables) to fit, but **every sentence below must appear, verbatim**.

**Front — mission and the round:**
> **You are a UAE company entering the e-invoicing regime. Every invoice is a test. Build the most compliant, most profitable company in the room.**
>
> **Your mission** — Finish the game with the **highest capital**. Every company starts with **AED 1,000,000**.
>
> **How the round works**
> 1. **Join on your phone** — scan the QR on your table's PIN card (or enter the PIN printed on it), claim a role.
> 2. **Your table has a deck of invoice cards.** Cards move around the room — you hold yours, and you'll receive cards from other tables too.
> 3. **When a card reaches your Tax & Compliance officer:** scan the QR (or tap "Can't scan? Enter card ID" and type the ID under the QR).
> 4. **READ the invoice on screen.** Look for the tell-tale signs of a compliant e-invoice:
>    - ✅ Both **TRNs** present (yours and the buyer's)
>    - ✅ All **51 mandatory fields** populated
>    - ✅ Standard **PINT AE XML** format
>    - ✅ Routed through an **Accredited Service Provider (ASP)**
>    - ⚠️ Red flags: missing TRN, blank fields, odd amounts, "direct email" instead of PINT, credit-note irregularities
> 5. **Decide: FILE or QUARANTINE.**
>    - FILE a **valid** invoice → **+AED 50,000**
>    - QUARANTINE an **invalid** one → **+AED 10,000**
>    - Quarantine a valid one → **−AED 25,000**
>    - File an invalid one → you've just submitted a non-compliant invoice — penalty applies
> 6. **The platform shows you the verdict + the regulation** every single time. That explanation is the whole point — you learn by deciding.

**Back — roles, phases, golden rule:**
> **The roles (5 per table)** — as a compact table (client naming: Player 1–5):
> | Role | What you do |
> |---|---|
> | **Player 1** | Watch the capital, call the strategy |
> | **Player 2** | Scan cards, read invoices, FILE / QUARANTINE |
> | **Player 3** | Watch system health, handle outages in Phase C |
> | **Player 4** | Source invoices from other tables, close the trades |
> | **Player 5** | Find foreign invoices, take them to the ASP for return-to-owner trades |
>
> **Phases**
> - **LOBBY → TUTORIAL** — join, practice card
> - **A — Internal Audit:** scanning opens. File and quarantine everything you can.
> - **B — Inter-company:** trading opens. Return foreign invoices to their owner via the ASP → **both** companies gain **AED 5,000**.
> - **C — Outages:** systems fail. Fix your outage (CIO) or bleed AED every minute. Green control cards unlock.
> - **FROZEN → DEBRIEF:** leaderboard locked. Winners announced with the data.
>
> **One golden rule** — **Valid and invalid cards look identical.** You cannot spot them by color or design — only by reading. That is the training.
>
> *Zero PII: the platform stores no names, no emails, no phone numbers. Teams are tables, players are roles.*

---

## ITEM 4 — Role lanyard inserts
**Quantity:** 60 (12 per role, 10 in use + 2 spares each) · **Size:** 95 × 60 mm, portrait, 300 gsm, rounded corners. Five role variants, each in its own colour. Colour is identity here, not a verdict — pair every role with its icon.

| Role | Colour | Icon | Printed instruction (verbatim) |
|---|---|---|---|
| **Player 1** | Violet | ledger/scale | "You hold the ledger. You are the only one who sees the money and the clock. You decide nothing alone." |
| **Player 2** | Red | magnifier/document | "You are the only person who can scan. Read every invoice before you do." |
| **Player 3** | Orange | terminal/pulse | "Nothing will happen to you for 40 minutes. Then everything will." |
| **Player 4** | Green | handshake/nodes | "You will leave this table. Three other tables hold what you need." |
| **Player 5** | Blue | route/arrow | "You run to the ASP Station. Nothing clears without you." |

*(Client naming decision, Aug 2026: roles are "Player 1–5" — the audience is all senior finance; no job titles. The numbered role is the identity; the printed instruction carries the job.)*

Layout: role name Outfit 800 ~18 pt in the role colour on paper, icon at top, one-line instruction Source Sans 3 14 pt in ink. A small mono tag `ROLE` in the top-right corner. Do not add any other text.

---

## ITEM 5 — Transaction Ledger mats
**Quantity:** 10 · **Size:** A2 landscape (594 × 420 mm), 2 mm vinyl mat, matte, anti-slip backing. Print as flat artwork with the table number as a variable per copy.

Layout, exactly as specified:
- **Top bar:** `TABLE ⬤ T-0X` at **60 pt** Outfit 800, top-left, in ink on paper — visible from across the room — with the title **THE TRANSACTION LEDGER** top-centre and `Q1 2027` top-right, both muted.
- **Routing Diagram** (as specified above) in the upper area, at full size, with the five labelled nodes.
- **Three card zones** in a row beneath the diagram, printed outlines **95 × 145 mm** with a 2 mm dashed rule, each titled: **PENDING INVOICES** · **FILED & CLEARED** · **FTA QUARANTINE**. No pockets, no sleeves — printed outlines only.
- **Two lower zones:** **HELD FOR OTHER TABLES** (foreign invoices) and **CONTROLS DEPLOYED** (played control cards), each a labelled panel with dashed outlines.
- The five node colours are the only accent colours on the mat. The table number variable must be identical in position on every mat.

---

## ITEM 6 — Table tents
**Quantity:** 10 · **Size:** A5 tent, 350 gsm, folded with **four visible faces** (two outer, two inner). The table number at **200 pt** Outfit 800 on **all four faces**, with the small word `TABLE` in 24 pt caps above it. Nothing else on any face. Variable per copy (01–10).

---

## ITEM 7 — Invoice folder labels
**Quantity:** 10 · **Size:** A5 label (applied to a manila folder). Copy, verbatim: `PENDING — Q1 2027` — Outfit 700, ~48 pt, ink, centred, with a small document icon above. Nothing else.

---

## ITEM 8 — Quarantine tray labels
**Quantity:** 10 · **Size:** A5 label (applied to a card tray). Copy, verbatim: `FTA QUARANTINE` — Outfit 700, ~48 pt, ink, centred, with a small shield icon above. Nothing else.

---

## ITEM 9 — Outage envelopes
**Quantity:** 10 · **Size:** A6, sealed, matte. **Front:** `DO NOT OPEN UNTIL INSTRUCTED` — Outfit 800, 20 pt, ink, centred, with a small sealed-envelope icon. **Inside sheet:** the fallback code `[OUTAGE-CODE]` in 24 pt mono — render the placeholder visibly, flag replace-before-print — plus one line: *"Hint: the answer is on the table. Read the routing diagram on your mat."* (Draft copy — organizer may edit.)

---

## ITEM 10 — Reset sort tray labels
**Quantity:** 10 · **Size:** A6 label (applied to a tray). The table number `T-01` … `T-10` at **100 pt** Outfit 800, ink, with the word `RESET` in 18 pt muted small caps beneath. Variable per copy. Nothing else.

---

## ITEM 11 — ASP Station signage
**Quantity:** 2 · **Size:** A2 foamboard (print flat, 594 × 420 mm, with 3 mm bleed). **Headline, verbatim:** `ACCREDITED SERVICE PROVIDER — CORNER 3 / CORNER 4` — Outfit 800, 64 pt, white on navy, centred. Beneath it, the **Routing Diagram** at large size with nodes C3 and C4 emphasised (thicker outline only — same colours). Small mono footer: `SCAN STATION`. Nothing else.

---

## ITEM 12 — Facilitator trade matrix
**Quantity:** 4 · **Size:** A4 portrait, 250 gsm, matte. **Data:** render the attached `trade_matrix.csv` exactly — header row `table | must_obtain_from | is_holding_for` and every data row, in a clean grid, Outfit 700 for the table column, Source Sans 3 14 pt for the cell values, hairline row rules, muted header row. Title at top: `TRADE MATRIX — FACILITATOR REFERENCE` in Outfit 800 24 pt with a small compass icon. Nothing else. (If the CSV is not attached, render the template with the header row and 10 empty rows and flag it.)

---

## ITEM 13 — CTA debrief cards
**Quantity:** 60 · **Size:** 90 × 140 mm, same stock as the game cards. **Front:** headline `BOOK YOUR ASSESSMENT` — Outfit 800, 22 pt, ink; one support line in Source Sans 3 16 pt: *"The simulation is over. The deadline is not."* (Draft copy — organizer may edit); a **QR chip** (28 × 28 mm, standard white chip panel) encoding the booking URL `[BOOKING-URL]` — render a real QR for the placeholder string and flag replace-before-print; the URL itself in 10 pt mono beneath the chip. **Back:** plain paper, small centred mark `Kamel Pay · Beyond Plus` in muted 14 pt. Nothing else.

---

## Deliverables

1. **Template proofs first** — one proof per item at true scale (Items 1–13, in the order above), as an interactive HTML preview with a data/variant switcher where the item has variables (table numbers, PINs, roles).
2. **The full rendered set** — print-ready sheets (A4 or appropriate imposition, 3 mm bleed, crop marks), grouped by item with exact quantities: 60 PIN cards, 30 reference sheets, 10 guides, 60 role inserts, 10 mats, 10 tents, 10+10 labels, 10 envelopes, 10 labels, 2 signs, 4 matrices, 60 CTA cards.
3. A downloadable **300 dpi PDF** of the complete sheet set.
4. A **one-page printer spec** (zones + measurements + colour values + finish, per item).
5. **Handoff confirmation:** every row of the attached CSVs rendered, all QR payloads verified scannable, no PII anywhere, no "good/bad" signalling, deck-uniformity within each item, all `[PLACEHOLDER]` items flagged for replacement.

Start with the Item 1 (Table PIN cards) template proof.
