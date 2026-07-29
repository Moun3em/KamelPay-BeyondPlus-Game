#!/usr/bin/env python3
"""
FIVE-CORNER COMPLIANCE SIMULATION - Card Generator
Kamel Pay x Beyond Plus

Generates the complete card set for any number of tables (validated N = 6..12).
Outputs:
  - cards_seed.json          -> database seed for the Vercel platform
  - card_manifest.xlsx       -> print-vendor manifest (one row per physical card)
  - trade_matrix.csv         -> facilitator sheet: who must trade with whom

Usage:  python3 generate_cards.py --tables 10
"""

import argparse, json, csv, os, hashlib, random

# Unambiguous character set: no O/0, I/1, S/5, B/8, Z/2.
# These cards are read aloud across a noisy ballroom by people without reading glasses.
PIN_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679"

# ---------------------------------------------------------------------------
# ARCHETYPES
# ---------------------------------------------------------------------------
# Each table owns 6 VALID invoices (3 in its own folder, 3 seeded to neighbours)
# and 4 INVALID invoices (all in its own folder).
# Folder = 3 own-valid + 4 own-invalid + 3 foreign-valid = 10 Red cards.

VALID_ARCHETYPES = [
    {
        "code": "V1",
        "title": "STANDARD B2B SUPPLY",
        "counterparty": "Meridian Logistics LLC (Mainland Dubai)",
        "amount": "AED 486,200.00",
        "vat": "AED 23,152.38 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Supplier TRN: 100234567800003 — PRESENT",
            "Buyer TRN: 100987654300003 — PRESENT",
            "Mandatory semantic fields: 51 of 51 — COMPLETE",
            "Issued 04 Jan 2027 · Transmitted 04 Jan 2027",
        ],
        "verdict": "FILE",
        "why": "Structured PINT AE XML, both TRNs present, all 51 mandatory tax-invoice fields populated, routed through both Accredited Service Providers and reported to the FTA in near real time.",
    },
    {
        "code": "V2",
        "title": "FREE ZONE B2B SUPPLY",
        "counterparty": "Harbourline FZE (JAFZA) → Mainland buyer",
        "amount": "AED 1,204,000.00",
        "vat": "AED 57,333.33 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Free Zone identifier: JAFZA — DECLARED",
            "Supplier TRN & Buyer TRN — BOTH PRESENT",
            "Mandatory semantic fields: 51 of 51 — COMPLETE",
            "Zone code populated in BT-ZONE segment",
        ],
        "verdict": "FILE",
        "why": "Ministerial Decision No. 243 of 2025 contains NO free-zone carve-out. JAFZA, DMCC, IFZA, RAKEZ, ADGM and DIFC entities are all in scope for B2B and B2G. This invoice is correctly formatted and must be filed.",
    },
    {
        "code": "V3",
        "title": "B2G GOVERNMENT SUPPLY",
        "counterparty": "Emirates Public Works Authority",
        "amount": "AED 2,750,000.00",
        "vat": "AED 130,952.38 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Buyer classification: GOVERNMENT ENTITY",
            "Purchase Order reference — PRESENT",
            "Mandatory semantic fields: 51 of 51 — COMPLETE",
            "Government go-live obligation: 1 October 2027",
        ],
        "verdict": "FILE",
        "why": "B2G is explicitly in scope. Your Phase 1 obligation began 1 January 2027 regardless of the buyer's own later go-live date — the supplier's phase governs the supplier's duty to transmit.",
    },
    {
        "code": "V4",
        "title": "E-CREDIT NOTE",
        "counterparty": "Nakheel Interiors Trading LLC",
        "amount": "– AED 92,400.00 (credit)",
        "vat": "– AED 4,400.00 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "References original invoice ID — PRESENT",
            "Reason code: goods returned — PRESENT",
            "Mandatory semantic fields: COMPLETE",
            "Issued within the permitted window",
        ],
        "verdict": "FILE",
        "why": "E-credit notes carry the same transmission obligation as e-invoices. Failure to issue or transmit one attracts AED 100 per document, capped at AED 5,000 per month.",
    },
    {
        "code": "V5",
        "title": "EXPORT SUPPLY — ZERO RATED",
        "counterparty": "Qadeer Industrial Co. (Kingdom of Saudi Arabia)",
        "amount": "AED 830,500.00",
        "vat": "AED 0.00 — zero-rated export",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Zero-rate justification code — PRESENT",
            "Export evidence reference — PRESENT",
            "Supplier TRN — PRESENT",
            "Mandatory semantic fields: COMPLETE",
        ],
        "verdict": "FILE",
        "why": "A zero VAT amount is not the same as an out-of-scope transaction. The document still routes through the five corners and is still reported to the FTA.",
    },
    {
        "code": "V6",
        "title": "SELF-BILLED SUPPLY",
        "counterparty": "Al Rayyan Contracting Group (self-billing agreement)",
        "amount": "AED 1,640,000.00",
        "vat": "AED 78,095.24 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Self-billing agreement reference — PRESENT",
            "Both party TRNs — PRESENT",
            "Document type code: self-billed invoice",
            "Mandatory semantic fields: COMPLETE",
        ],
        "verdict": "FILE",
        "why": "Self-billing does not remove the e-invoicing obligation — it only moves who generates the document. The agreement reference is a mandatory field and it is present.",
    },
]

INVALID_ARCHETYPES = [
    {
        "code": "X1",
        "title": "SCANNED PDF INVOICE",
        "counterparty": "Zenith Facilities Management LLC",
        "amount": "AED 312,750.00",
        "vat": "AED 14,892.86 @ 5%",
        "format": "PDF — scanned, emailed as attachment",
        "route": "C1 → C2 direct (email)",
        "detail": [
            "File type: invoice_final_v3_signed.pdf",
            "Human-readable, machine-unreadable",
            "No structured XML payload",
            "Sent from accounts@ mailbox",
        ],
        "verdict": "QUARANTINE",
        "penalty": 100,
        "penalty_label": "AED 100 per document (capped AED 5,000/month)",
        "why": "A scanned PDF, a paper original and an emailed image are NOT e-invoices. The UAE mandate requires a structured PINT AE XML payload. Filing this document constitutes a failure to issue a valid e-invoice.",
    },
    {
        "code": "X2",
        "title": "MISSING BUYER TRN",
        "counterparty": "Sable Marine Services LLC",
        "amount": "AED 674,300.00",
        "vat": "AED 32,109.52 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C3 → C4 → C2, reported C5",
        "detail": [
            "Supplier TRN: 100445566700003 — PRESENT",
            "Buyer TRN: —————— — ABSENT",
            "Mandatory semantic fields: 50 of 51 — INCOMPLETE",
            "Validation status at C3: REJECTED",
        ],
        "verdict": "QUARANTINE",
        "penalty": 100,
        "penalty_label": "AED 100 per document (capped AED 5,000/month)",
        "why": "An electronic tax invoice requires 51 mandatory semantic fields (a commercial e-invoice requires 49). Fifty out of fifty-one is a rejection, not a rounding error. The Accredited Service Provider will refuse it at Corner 3.",
    },
    {
        "code": "X3",
        "title": "DIRECT EMAIL TRANSMISSION",
        "counterparty": "Vantage Steel Trading LLC",
        "amount": "AED 1,118,000.00",
        "vat": "AED 53,238.10 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "route": "C1 → C2 DIRECT — corners 3, 4 and 5 bypassed",
        "detail": [
            "XML payload: valid and complete",
            "Supplier ASP: NOT ENGAGED",
            "Buyer ASP: NOT ENGAGED",
            "FTA reporting status: NOT REPORTED",
        ],
        "verdict": "QUARANTINE",
        "penalty": 100,
        "penalty_label": "AED 100 per document (capped AED 5,000/month)",
        "why": "The most expensive trap in the room. The XML is perfect — and it is still non-compliant. Under the DCTCE five-corner model an invoice is only 'issued' once it has travelled C1→C3→C4→C2 with simultaneous reporting to the FTA at C5. Emailing valid XML directly to your buyer reports nothing to anyone.",
    },
    {
        "code": "X4",
        "title": "NO ACCREDITED SERVICE PROVIDER",
        "counterparty": "Internal — entity onboarding record",
        "amount": "Entity revenue: AED 71,400,000",
        "vat": "n/a",
        "format": "—",
        "route": "No route — no ASP appointed",
        "detail": [
            "Phase 1 threshold (≥ AED 50M): APPLIES",
            "ASP appointment deadline: 30 October 2026",
            "Appointment status as at record date: NONE",
            "Mandatory go-live: 1 January 2027",
        ],
        "verdict": "QUARANTINE",
        "penalty": 5000,
        "penalty_label": "AED 5,000 per month, or part thereof, until remedied",
        "why": "This is not an invoice problem, it is an existence problem. Failure to implement the system or appoint an Accredited Service Provider by the deadline accrues AED 5,000 every month until fixed — whether or not you issue a single invoice.",
    },
    {
        "code": "X5",
        "title": "FREE ZONE 'OUT OF SCOPE' CLAIM",
        "counterparty": "Crescent Ventures DMCC",
        "amount": "AED 528,900.00",
        "vat": "AED 25,185.71 @ 5%",
        "format": "PDF — marked 'Free Zone: outside DCTCE scope'",
        "route": "C1 → C2 direct",
        "detail": [
            "Free Zone: DMCC",
            "Buyer: mainland UAE company (B2B)",
            "Stamp on document: 'E-INVOICING EXEMPT'",
            "Basis for exemption cited: none",
        ],
        "verdict": "QUARANTINE",
        "penalty": 100,
        "penalty_label": "AED 100 per document (capped AED 5,000/month)",
        "why": "The stamp is wrong. There is no free-zone exemption. DMCC, JAFZA, IFZA, RAKEZ, ADGM and DIFC entities are all in scope — the trigger is the B2B or B2G transaction, not the entity's location or even its VAT registration status.",
    },
    {
        "code": "X6",
        "title": "B2C RETAIL SALE",
        "counterparty": "Ms. A. Haddad — individual consumer",
        "amount": "AED 4,150.00",
        "vat": "AED 197.62 @ 5%",
        "format": "Point-of-sale receipt",
        "route": "Retail POS — no ASP route",
        "detail": [
            "Buyer type: NATURAL PERSON (not a business)",
            "Buyer TRN: none — consumer has no TRN",
            "Transaction class: B2C",
            "Peppol network transmission: not applicable",
        ],
        "verdict": "QUARANTINE",
        "penalty": 0,
        "penalty_label": "No penalty — correctly out of scope",
        "why": "The reverse trap. B2C transactions are excluded from the current phases until a further Ministerial Decision extends the mandate. A team that files everything on reflex wastes a cycle here; a team that reads the buyer type gets it right. Compliance is not 'submit more', it is 'classify correctly'.",
    },
]

GREEN_CARDS = [
    {
        "code": "GRN-01", "title": "DEPLOY P.R.O. CARD",
        "strap": "Government & administrative payments, ring-fenced.",
        "body": "Issue a dedicated P.R.O. card with merchant-category controls locked to government portals, immigration, licensing and utility payees. Spend outside the permitted categories is declined at authorisation — before it becomes a reconciliation problem.",
        "effect": "IMMUNITY: your table can no longer incur the AED 5,000/month implementation penalty for the remainder of the simulation. +AED 25,000 capital.",
        "teaches": "Controls applied at the point of sale beat controls applied at month-end.",
    },
    {
        "code": "GRN-02", "title": "DEPLOY C-SUITE CARD",
        "strap": "Executive travel and lifestyle, with a policy attached.",
        "body": "Issue premium executive cards with travel privileges and a policy envelope configured centrally — limits, categories and approval thresholds set once in the web portal, enforced on every swipe.",
        "effect": "+AED 30,000 capital. Unlocks one bonus executive travel transaction worth +AED 20,000 if played before the final 5 minutes.",
        "teaches": "Premium benefits and spend governance are not a trade-off.",
    },
    {
        "code": "GRN-03", "title": "SET DAILY TRANSACTION LIMIT",
        "strap": "AED 10,000 per day. Set in seconds, from anywhere.",
        "body": "Cap manual spending per card, per day, from the central web portal. No bank visit, no form, no waiting for a relationship manager to call back.",
        "effect": "DAMPER: every penalty your table incurs from this point is capped at AED 10,000, regardless of size. +AED 15,000 capital.",
        "teaches": "The cheapest risk control is the one you can change in real time.",
    },
    {
        "code": "GRN-04", "title": "AI-OCR RECEIPT MATCHING",
        "strap": "The receipt chase, deleted.",
        "body": "Capture the receipt at the moment of spend. AI-driven optical character recognition reads it, auto-matches it to the settled transaction, and posts it to the ledger without a human touching a spreadsheet.",
        "effect": "AUTOMATION: instantly files every remaining VALID invoice your table holds at full value, and safely quarantines every INVALID one with zero penalty. Play it, and the machine does not make the mistakes you were about to make.",
        "teaches": "This is the single most important card in the deck, and the closing argument of the entire event.",
    },
    {
        "code": "GRN-05", "title": "CONSOLIDATE VIRTUAL IBANs",
        "strap": "One dashboard. Every entity.",
        "body": "Assign a virtual IBAN per entity, per department or per project, all reporting into one central portal with 360-degree visibility across the group.",
        "effect": "One-time: file ONE foreign invoice you are holding without trading it — group consolidation lets you recognise it internally. +AED 20,000 capital.",
        "teaches": "Multi-entity groups fail compliance at the seams between entities.",
    },
    {
        "code": "GRN-06", "title": "CONTINUOUS LEDGER CLOSE",
        "strap": "The month-end that never happens.",
        "body": "Transactions, receipts and approvals reconcile continuously rather than in a five-day scramble after the period ends. The ledger is always closed, because it is never open.",
        "effect": "MULTIPLIER: all capital your table earns in the final 5 minutes of the simulation is doubled.",
        "teaches": "Real-time reporting regimes are incompatible with retrospective bookkeeping.",
    },
]

BLUE_CARDS = [
    {
        "code": "BLU-01", "title": "CONSOLIDATE ENTITY",
        "strap": "Alliance card · requires one other table to agree",
        "body": "Two group entities merge their reporting for a single filing window. Both tables present this card together at the ASP Station.",
        "effect": "Both tables immediately file every foreign invoice they hold belonging to the other. Both gain +AED 40,000. Can only be played once per table.",
    },
    {
        "code": "BLU-02", "title": "WPS PAYROLL SYNC",
        "strap": "Wage Protection System · play alone or in a trade",
        "body": "Synchronise payroll disbursement with the Wage Protection System and settle salaries to employee cards in one instruction.",
        "effect": "+AED 35,000 capital. Immunises your table against the 'Payroll Shock' market event if the facilitator triggers it.",
    },
    {
        "code": "BLU-03", "title": "ASP FAST-TRACK",
        "strap": "Alliance card · requires one other table to agree",
        "body": "Pre-agreed interoperability between two Accredited Service Providers. The trade clears without either party walking to the station.",
        "effect": "Validate one card trade from your seat — no queue, no walk. Both tables save the time and gain +AED 10,000 each.",
    },
    {
        "code": "BLU-04", "title": "MUTUAL RECOGNITION PACT",
        "strap": "Alliance card · requires one other table to agree",
        "body": "Two counterparties formally recognise each other's compliance posture, unlocking preferential settlement terms.",
        "effect": "The next trade between these two tables pays DOUBLE the standard network bonus to both sides. Playable once per pairing.",
    },
]

# ---------------------------------------------------------------------------
# ECONOMY
# ---------------------------------------------------------------------------
ECONOMY = {
    "starting_capital": 1_000_000,
    "file_valid_own": 50_000,
    "file_foreign_rejected": 0,          # system refuses: "not your TRN"
    "quarantine_invalid_correct": 10_000,
    "quarantine_valid_incorrect": -25_000,
    "trade_network_bonus": 5_000,        # per side, per validated trade
    "outage_tick_penalty": -1_000,       # per 10 seconds unreported
    "ledger_close_bonus": 75_000,        # all 6 own valid invoices filed
}

# ---------------------------------------------------------------------------
# GENERATION
# ---------------------------------------------------------------------------
def qr_payload(card_id):
    """Opaque, non-guessable QR payload. No PII, no readable answer key."""
    h = hashlib.sha256(f"kp5c::{card_id}".encode()).hexdigest()[:10].upper()
    return f"KP5C-{h}"


def build(n_tables):
    if n_tables < 6:
        raise SystemExit("Trade ring requires at least 6 tables (offsets +1,+2,+3 need N>=5; 6 is the safe floor).")

    cards = []
    # --- RED: valid ---------------------------------------------------------
    for t in range(1, n_tables + 1):
        for i, arch in enumerate(VALID_ARCHETYPES):
            # first 3 valid archetypes sit in the owner's own folder,
            # the last 3 are seeded to tables t+1, t+2, t+3 (ring, mod N)
            if i < 3:
                held_by = t
            else:
                held_by = ((t - 1 + (i - 2)) % n_tables) + 1   # i=3->t+1, 4->t+2, 5->t+3
            cid = f"RED-T{t:02d}-{arch['code']}"
            cards.append({
                "card_id": cid,
                "qr": qr_payload(cid),
                "deck": "RED",
                "archetype": arch["code"],
                "owner_table": t,
                "held_by_table_at_setup": held_by,
                "is_foreign_at_setup": held_by != t,
                "validity": "VALID",
                "correct_action": "FILE",
                "penalty_aed": 0,
                **{k: v for k, v in arch.items() if k != "code"},
            })

    # --- RED: invalid -------------------------------------------------------
    for t in range(1, n_tables + 1):
        # rotate which 4 of the 6 defect archetypes this table receives
        picks = [INVALID_ARCHETYPES[(t - 1 + k) % len(INVALID_ARCHETYPES)] for k in range(4)]
        for arch in picks:
            cid = f"RED-T{t:02d}-{arch['code']}"
            cards.append({
                "card_id": cid,
                "qr": qr_payload(cid),
                "deck": "RED",
                "archetype": arch["code"],
                "owner_table": t,
                "held_by_table_at_setup": t,
                "is_foreign_at_setup": False,
                "validity": "OUT_OF_SCOPE" if arch["code"] == "X6" else "INVALID",
                "correct_action": "QUARANTINE",
                "penalty_aed": arch["penalty"],
                **{k: v for k, v in arch.items() if k != "code"},
            })

    # --- GREEN / BLUE -------------------------------------------------------
    for t in range(1, n_tables + 1):
        for arch in GREEN_CARDS:
            cid = f"GRN-T{t:02d}-{arch['code'].split('-')[1]}"
            cards.append({"card_id": cid, "qr": qr_payload(cid), "deck": "GREEN",
                          "archetype": arch["code"], "owner_table": t,
                          "held_by_table_at_setup": t, "is_foreign_at_setup": False,
                          "locked_until_phase": "C", **{k: v for k, v in arch.items() if k != "code"}})
        for arch in BLUE_CARDS:
            cid = f"BLU-T{t:02d}-{arch['code'].split('-')[1]}"
            cards.append({"card_id": cid, "qr": qr_payload(cid), "deck": "BLUE",
                          "archetype": arch["code"], "owner_table": t,
                          "held_by_table_at_setup": t, "is_foreign_at_setup": False,
                          "locked_until_phase": "B", **{k: v for k, v in arch.items() if k != "code"}})

    # --- PRACTICE + PIN -----------------------------------------------------
    for t in range(1, n_tables + 1):
        cid = f"PRACTICE-T{t:02d}"
        cards.append({"card_id": cid, "qr": qr_payload(cid), "deck": "PRACTICE",
                      "archetype": "TUTORIAL", "owner_table": t,
                      "held_by_table_at_setup": t, "is_foreign_at_setup": False,
                      "title": "PRACTICE INVOICE — SCAN ME FIRST",
                      "body": "Camera check. Scan this card to confirm your device is connected and your role is assigned. No score effect."})

    return cards


def table_pins(n, seed):
    """Deterministic given --pin-seed, so print and platform CANNOT drift apart.
    Record the seed you used. Regenerating with the same seed reproduces the
    exact PINs printed on the physical cards."""
    rnd = random.Random(f"kp5c-pins::{seed}")
    pins, used = {}, set()
    for t in range(1, n + 1):
        while True:
            p = "".join(rnd.choice(PIN_ALPHABET) for _ in range(6))
            if p not in used:
                used.add(p); pins[t] = p; break
    return pins


def trade_matrix(n):
    rows = []
    for t in range(1, n + 1):
        needs = [(((t - 1 + k) % n) + 1, VALID_ARCHETYPES[k + 2]["code"]) for k in range(1, 4)]
        holds = [(((t - 1 - k) % n) + 1, VALID_ARCHETYPES[k + 2]["code"]) for k in range(1, 4)]
        rows.append({
            "table": t,
            "must_obtain_from": "; ".join(f"T{a:02d} ({b})" for a, b in needs),
            "is_holding_for": "; ".join(f"T{a:02d} ({b})" for a, b in holds),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tables", type=int, default=10)
    ap.add_argument("--pin-seed", default="kamelpay-2026-event-01",
                    help="RECORD THIS. Same seed = same PINs = print and platform agree.")
    ap.add_argument("--out", default=os.path.dirname(os.path.abspath(__file__)))
    a = ap.parse_args()

    cards = build(a.tables)
    tm = trade_matrix(a.tables)
    pins = table_pins(a.tables, a.pin_seed)

    seed = {
        "meta": {
            "event": "The Five-Corner Compliance Simulation",
            "client": "Kamel Pay",
            "producer": "Beyond Plus",
            "tables": a.tables,
            "players_per_table": 5,
            "roles": ["CFO", "TAX_COMPLIANCE_DIRECTOR", "CIO", "PROCUREMENT_LEAD", "OPERATIONS_LEAD"],
            "pin_seed": a.pin_seed,
        },
        "teams": [{"table_no": t, "pin": pins[t]} for t in range(1, a.tables + 1)],
        "economy": ECONOMY,
        "ledger_close_requirement": {"own_valid_invoices_to_file": 6},
        "cards": cards,
        "trade_matrix": tm,
    }

    with open(os.path.join(a.out, "cards_seed.json"), "w") as f:
        json.dump(seed, f, indent=2, ensure_ascii=False)

    # print manifest
    cols = ["card_id", "qr", "deck", "archetype", "owner_table", "held_by_table_at_setup",
            "is_foreign_at_setup", "validity", "correct_action", "penalty_aed", "title",
            "counterparty", "amount", "vat", "format", "route", "verdict"]
    with open(os.path.join(a.out, "card_manifest.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for c in cards:
            w.writerow(c)

    with open(os.path.join(a.out, "trade_matrix.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["table", "must_obtain_from", "is_holding_for"])
        w.writeheader(); w.writerows(tm)

    # PIN cards: this file goes to the PRINTER and is seeded into the PLATFORM.
    with open(os.path.join(a.out, "table_pins.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["table_no", "pin", "join_url"])
        w.writeheader()
        for t in range(1, a.tables + 1):
            w.writerow({"table_no": f"T-{t:02d}", "pin": pins[t],
                        "join_url": f"https://[DOMAIN]/join?t={t:02d}"})

    red = [c for c in cards if c["deck"] == "RED"]
    print(f"Tables: {a.tables}")
    print(f"  RED    {len(red):4d}  ({len(red)//a.tables} per table)")
    print(f"  GREEN  {len([c for c in cards if c['deck']=='GREEN']):4d}")
    print(f"  BLUE   {len([c for c in cards if c['deck']=='BLUE']):4d}")
    print(f"  PRACT  {len([c for c in cards if c['deck']=='PRACTICE']):4d}")
    print(f"  TOTAL  {len(cards):4d}")


if __name__ == "__main__":
    main()
