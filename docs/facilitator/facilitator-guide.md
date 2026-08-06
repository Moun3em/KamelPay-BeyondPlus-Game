# Five-Corner Compliance Simulation — Facilitator Guide

You are about to run a 90‑minute serious game for ~50 senior finance executives. You don't need to be a subject‑matter expert. The platform carries the content. Your job is the room.

---

## 1. What this is

Ten companies. One million AED each. One hour on the clock. Players scan physical invoice cards, decide FILE or QUARANTINE, and a live leaderboard scores every decision against real UAE e‑invoicing regulation. The golden rule: **valid and invalid cards look identical** — the only way to decide is to read the invoice. That's the training. You guide the room. The platform does the teaching.

---

## 2. Before the event (T−30 min)

- [ ] **Verify the projection screen** — pull up `/projection` on the venue screen. The leaderboard must be visible from every seat.
- [ ] **Open the facilitator console** on your laptop: go to the same join link, enter `FACILITATE` on the table‑PIN screen. Bookmark it.
- [ ] **Walk every table** — each table should have: one table tent (with the join link + table PIN), the card deck (RED stacked first, GREEN sealed or face‑down, BLUE face‑down on top), one how‑to‑play card, two reference sheets, and a readiness status.
- [ ] **Wi‑Fi** — verify the dedicated SSID is live and phones can reach the link. No captive portal.
- [ ] **Brief floor facilitators** — "You walk the room during play. Only touch a table if a phone is genuinely dead. Use the console's Red flags to spot stragglers."

---

## 3. The 5 roles (one table = one company)

| Player | What they do | Required device? |
|---|---|---|
| **Player 1** | Holds the ledger. Sees the money and the clock. Calls the strategy. | Required |
| **Player 2** | **The only player who can scan.** Reads invoices, files or quarantines. | Required |
| **Player 3** | Owns system health. Solves outages in Phase C. | Required |
| **Player 4** | Owns the trade ring. Sources foreign invoices, negotiates with other tables. | Optional |
| **Player 5** | Pipeline. Scans volume, flags anomalies, runs to the ASP station. | Optional |

One phone can claim **ALL roles** — the game is playable from a single device.

---

## 4. The 4 card decks

- **RED (100 invoices)** — Live from minute 0. Scan, read, FILE or QUARANTINE. Some belong to OTHER tables. Valid and invalid look identical.
- **BLUE (40 alliance cards)** — Phase B. Cross‑table negotiation. Most are worthless without another table agreeing. **Deal‑making deck.**
- **GREEN (60 control cards)** — **Locked until Phase C** (after the table solves its outage). The KamelPay product payload — automated tools that make the manual work obsolete. **Do not let tables touch these before Phase C.**
- **PRACTICE (10)** — Tutorial only. One known‑good scan. No stakes. Marked "PRACTICE".

---

## 5. The session arc

### 09:00 — LOBBY (10 min) — "Get everyone in"
**Say:** *"Open the link on your phone, enter your table number and the PIN on your tent, and claim your roles — Player 1 through 5. One phone can hold all five roles."*
**Do:** Watch the console tables view. Use **Red flags** on the console to spot stragglers. Every table needs ≥3 devices.
**Console:** Phase = LOBBY. Do not press TUTORIAL until the room is in.

### 09:10 — TUTORIAL (3 min) — "Practice scan"
**Say:** *"Each table: take the PRACTICE card. Point your phone camera at the QR. File it. Read the explanation. If the WHY modal doesn't appear, raise your hand now."*
**Do:** Walk the room. Confirm the WHY modal appears on every phone. **This is the single most important technical check.** If a phone's camera fails, use the "Enter card ID" manual path under the QR scanner.
**Console:** Press **Advance to A**.

### 09:13 — Phase A · Internal Audit (15 min)
**Say:** *"Scanning is open. Read every invoice. FILE the compliant. QUARANTINE the traps. Read before you tap — the cards look identical. Go."*
**Do:** Encourage volume, not perfection. Nudge tables idle for >3 minutes. **Do not touch capital** unless a real device failure cost a table a scan.
**Console:** The clock runs. Watch capital movements. Red flags light up when a table's capital drops >20% in a minute. That's your signal to check the table.

### 09:28 — Phase B · Trading (25 min)
**Announce:** *"Trading is open. Three of your valid invoices are sitting at other tables. Players 4 and 5: find them, negotiate, and bring them to the ASP station."*
**Do:** **You ARE the ASP.** Open the console trade panel: **Card ID, From table, To table (owner), Validate.** Both tables earn +5,000 each. Keep a short queue. The platform shows the compliance verdict — read it aloud so the room hears the routing reason.
**Console:** Press **Advance to B**. The auto‑announcement fires on the projection.

### 09:53 — Phase C · Outages (20 min)
**Announce:** *"Outages are striking. Player 3: fix your systems. Every 10 seconds unresolved costs your table 1,000 AED."*
**Do:** Outages arm automatically on a stagger schedule. Each table gets hit at a different moment. **Do not pre‑resolve.** Force‑resolve only if a table is genuinely stuck (Player 3's phone died, or 3+ wrong guesses and they're bleeding hard). When an outage is resolved, GREEN cards unlock for that table. Announce it: *"Table 05, your systems are back — green cards are live."*
**Console:** Press **Advance to C**. Watch the −150,000 cap — a table bleeding hard may need a nudge.

### 10:13 — FROZEN (instant) → DEBRIEF (5+ min)
**Announce:** *"The leaderboard is frozen. The winner is the company with the highest compliant capital."*
**Do:** Show the projection. Announce the top 3.
**Then open the Debrief screen.** Land the line: *"You just did, under pressure, what a compliant e‑invoicing pipeline does every day: read, decide, transmit, verify."*
**Console:** Press **Freeze**. The kill switch is a last resort — don't touch it unless you must.

---

## 6. The facilitator console — every superpower

| Action | When | How |
|---|---|---|
| **Adjust capital** | Real device failure lost a scan | Console → Adjust. Enter amount + reason. |
| **Scan for a table** | Table has zero working phones | Console → Scan. Plays a card on their behalf. |
| **Force‑resolve outage** | Table stuck / Player 3 phone died | Console → Outages → Force‑resolve. Enter reason. |
| **Release a role** | Someone locked into the wrong role | Console → Devices → Release. Then they re‑claim. |
| **Pause / Resume** | Room chaos, fire alarm, projector dies | Console → Pause. Fix it. Resume. Clock resumes. |
| **Kill switch** | Game must end NOW | Console → Freeze. Leaderboard locks immediately. |
| **Reset game** | Full restart (only from LOBBY or FROZEN) | Console → Reset. **This wipes everything.** |

**Golden rule:** every action other than Pause needs a reason typed into the audit field. Do not skip it.

---

## 7. Emergency playbook

| Situation | Recovery |
|---|---|
| **Phone dies** | Reopen the link — session restores. If not, re‑join with the same table PIN + role. |
| **Camera fails on every phone** | Use **Enter card ID** (typed card ID under the QR). The game continues. |
| **Table has zero working phones** | **Console → Scan for table** — you play the card from your laptop. Follow the verdict. |
| **Table stuck / outage won't clear** | File a bug report and an alert. |
| **Wrong penalty applied** | Write a detailed incident report. |
| **Room chaos / fire alarm / projector down** | **PAUSE ALL** from the console. Fix the issue. Resume. |
| **Game must end NOW** | **Freeze.** Leaderboard locks. You lose the debrief. Use only in genuine emergency. |
| **Full restart needed** | Request approval for a manual Reset. |

---

## 8. The debrief — 5 minutes that sell the product

This is the most important part of the session. Don't rush it. Open the Debrief screen and land these five points:

1. **Total fines the room incurred** — the crowd gasps at the number. That's the cost of manual compliance.
2. **The most‑missed trap** — name it. "X3: format compliance is not route compliance." Let the room nod.
3. **GRN‑04: AI‑OCR** — "One card, on one table, would have done all of this in two seconds with zero errors." That is KamelPay.
4. **The rooms' own data** — show the Alliance Builder badge. Who traded the most? Who recovered best after an outage?
5. **The close:** *"You just proved that reading invoices carefully, under time pressure, is a skill — and that the right tool makes it automatic."*

Do not over‑explain. The numbers do the work. The silence after the total fines number is your strongest selling tool.

---

## 9. Checklist: 15 minutes before doors

- [ ] Projection screen on, `/projection` loaded
- [ ] Console open on your laptop, logged in with FACILITATE
- [ ] Every table: tent, card decks, how‑to‑play card, reference sheets → you walked the room
- [ ] Wi‑Fi tested on your own phone — the join link loads
- [ ] Phase = LOBBY. Clock at 00:00. Paused = false.
- [ ] Floor facilitators briefed
- [ ] Deep breath. You've got this.