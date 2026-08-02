#!/usr/bin/env python3
"""Generate spoiler-free card print data for the print designer.

Reads cards_seed.json, strips every need-to-know field (validity, archetype,
verdict, correct_action, penalty, why) and emits one row per card with
neutral invoice-language copy that carries the evidence WITHOUT stating the
answer. The designer never sees which cards are traps.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SEED = ROOT / "cards_seed.json"
OUT = ROOT / "docs" / "participants" / "print" / "card_print_data.csv"

seed = json.load(open(SEED))
cards = seed["cards"]

# --- neutral print-face copy per RED archetype -------------------------------
# body_lines: "Label: value" pairs (semicolon-separated) rendered as the card's
# fields block. Traps carry the defect as EVIDENCE (blank fields, attachment,
# stamp), never as a verdict word.
RED_COPY = {
    "V1": {
        "title": "STANDARD B2B SUPPLY",
        "counterparty": "Meridian Logistics LLC (Mainland Dubai)",
        "amount": "AED 486,200.00",
        "vat": "AED 23,152.38 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "Supplier TRN: 100234567800003; Buyer TRN: 100987654300003; Issued: 04 Jan 2027; Transmitted: 04 Jan 2027",
    },
    "V2": {
        "title": "FREE ZONE B2B SUPPLY",
        "counterparty": "Nakheel Free Zone Trading Co",
        "amount": "AED 1,204,000.00",
        "vat": "AED 57,333.33 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "Free Zone: JAFZA; Supplier TRN: 100445566700003; Buyer TRN: 100987654300003; Zone code: BT-ZONE populated",
    },
    "V3": {
        "title": "B2G GOVERNMENT SUPPLY",
        "counterparty": "Dubai Municipality (Government)",
        "amount": "AED 2,750,000.00",
        "vat": "AED 130,952.38 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "Buyer: Government entity; Purchase order ref: PO-2026-11842; Issued: 12 Feb 2027; Transmitted: 12 Feb 2027",
    },
    "V4": {
        "title": "E-CREDIT NOTE",
        "counterparty": "Gulf Distributors LLC",
        "amount": "- AED 92,400.00 (credit)",
        "vat": "- AED 4,400.00 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "References original invoice: INV-2026-09311; Reason code: goods returned; Issued: 03 Mar 2027",
    },
    "V5": {
        "title": "EXPORT SUPPLY — ZERO RATED",
        "counterparty": "Al Masaoud Exports (Free Zone)",
        "amount": "AED 830,500.00",
        "vat": "AED 0.00 — zero-rated export",
        "format": "PINT AE 1.0 (XML)",
        "body": "Zero-rate justification: EXPORT; Export evidence ref: EXD-2027-0041; Supplier TRN: 100234567800003",
    },
    "V6": {
        "title": "SELF-BILLED SUPPLY",
        "counterparty": "Emirates Facilities Group",
        "amount": "AED 1,640,000.00",
        "vat": "AED 78,095.24 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "Self-billing agreement ref: SBA-2026-0117; Document type: self-billed invoice; Supplier TRN: 100445566700003; Buyer TRN: 100987654300003",
    },
    # Traps: neutral titles; the defect lives in the data, never in the words.
    "X1": {
        "title": "FACILITIES MANAGEMENT INVOICE",
        "counterparty": "Zenith Facilities Management LLC",
        "amount": "AED 312,750.00",
        "vat": "AED 14,892.86 @ 5%",
        "format": "PDF attachment",
        "body": "Attachment: invoice_final_v3_signed.pdf; File type: PDF (scanned); Sent via: email attachment",
    },
    "X2": {
        "title": "OFFICE FIT-OUT INVOICE",
        "counterparty": "Urban Fit-Out Contracting LLC",
        "amount": "AED 674,300.00",
        "vat": "AED 32,109.52 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "Supplier TRN: 100445566700003; Buyer TRN: —; Issued: 19 Feb 2027; Transmitted: 19 Feb 2027",
    },
    "X3": {
        "title": "IT SERVICES INVOICE",
        "counterparty": "Nexus Cloud Services LLC",
        "amount": "AED 1,118,000.00",
        "vat": "AED 53,238.10 @ 5%",
        "format": "PINT AE 1.0 (XML)",
        "body": "XML payload: PINT AE 1.0; Supplier ASP: —; Buyer ASP: —; FTA reporting: —",
    },
    "X4": {
        "title": "ENTITY COMPLIANCE RECORD",
        "counterparty": "Ras Al Khaimah Holdings",
        "amount": "Entity revenue: AED 71,400,000",
        "vat": "—",
        "format": "—",
        "body": "Entity revenue: AED 71,400,000; ASP appointment deadline: 30 Oct 2026; Appointment status: —; Mandatory go-live: 01 Jan 2027",
    },
    "X5": {
        "title": "WAREHOUSE SUPPLY INVOICE",
        "counterparty": "DMCC Free Zone Trading DMCC",
        "amount": "AED 528,900.00",
        "vat": "AED 25,185.71 @ 5%",
        "format": "PDF document",
        "body": "Free Zone: DMCC; Buyer: mainland UAE company; Document stamp: \u201cE-INVOICING EXEMPT\u201d; Basis for exemption: —",
    },
    "X6": {
        "title": "RETAIL SALE RECEIPT",
        "counterparty": "Retail walk-in customer",
        "amount": "AED 4,150.00",
        "vat": "AED 197.62 @ 5%",
        "format": "Point-of-sale receipt",
        "body": "Buyer: individual consumer; Buyer TRN: none; Transaction class: B2C retail; Peppol network: n/a",
    },
}

# --- green/blue/practice copy (public mechanics, from the physical spec) -----
GREEN_COPY = {
    "GRN-01": ("DEPLOY P.R.O. CARD", "Permanent immunity to the AED 5,000/month implementation penalty · +25,000"),
    "GRN-02": ("DEPLOY C-SUITE CARD", "+30,000 · unlocks a bonus travel transaction worth +20,000"),
    "GRN-03": ("SET DAILY TRANSACTION LIMIT", "Caps every future penalty at AED 10,000 · +15,000"),
    "GRN-04": ("AI-OCR RECEIPT MATCHING", "Instantly files every remaining valid invoice at full value and quarantines every invalid one at zero penalty"),
    "GRN-05": ("CONSOLIDATE VIRTUAL IBANS", "File one foreign invoice without trading it · +20,000"),
    "GRN-06": ("CONTINUOUS LEDGER CLOSE", "Doubles all capital earned in the final 5 minutes"),
}
BLUE_COPY = {
    "BLU-01": ("CONSOLIDATE ENTITY", "Requires another table's agreement · Both file all foreign cards held for each other · +40,000 each"),
    "BLU-02": ("WPS PAYROLL SYNC", "Playable alone · +35,000 · immunity to the Payroll Shock event"),
    "BLU-03": ("ASP FAST-TRACK", "Requires another table's agreement · Validate a trade from your seat, no queue · +10,000 each"),
    "BLU-04": ("MUTUAL RECOGNITION PACT", "Requires another table's agreement · Next trade between this pair pays double"),
}
PRACTICE_COPY = {
    "TUTORIAL": ("PRACTICE INVOICE — SCAN ME FIRST", "Tutorial card · scan to start the practice round"),
}

BAND = {"RED": "#D64550", "GREEN": "#2E8B57", "BLUE": "#0059F7", "PRACTICE": "#8A94A6"}
LABEL = {"RED": "INVOICE", "GREEN": "CONTROL", "BLUE": "ALLIANCE", "PRACTICE": "PRACTICE"}

rows = []
for i, c in enumerate(cards, 1):
    deck = c["deck"]
    arch = str(c.get("archetype") or "")
    band = BAND[deck]
    label = LABEL[deck]
    owner = f"T-{int(c['owner_table']):02d}" if c.get("owner_table") else "—"
    if deck == "RED":
        cp = RED_COPY[arch]
        rows.append({
            "print_ref": f"CARD-{i:03d}", "deck_label": label, "band_color": band,
            "owner_table": owner, "title": cp["title"], "counterparty": cp["counterparty"],
            "amount": cp["amount"], "vat": cp["vat"], "format_note": cp["format"],
            "body_lines": cp["body"], "qr_payload": c.get("qr", ""), "card_id": c["card_id"],
        })
    elif deck == "GREEN":
        title, effect = GREEN_COPY.get(arch, (c.get("title") or arch, ""))
        rows.append({
            "print_ref": f"CARD-{i:03d}", "deck_label": label, "band_color": band,
            "owner_table": owner, "title": title, "counterparty": "",
            "amount": "", "vat": "", "format_note": "",
            "body_lines": effect, "qr_payload": c.get("qr", ""), "card_id": c["card_id"],
        })
    elif deck == "BLUE":
        title, effect = BLUE_COPY.get(arch, (c.get("title") or arch, ""))
        rows.append({
            "print_ref": f"CARD-{i:03d}", "deck_label": label, "band_color": band,
            "owner_table": owner, "title": title, "counterparty": "",
            "amount": "", "vat": "", "format_note": "",
            "body_lines": effect, "qr_payload": c.get("qr", ""), "card_id": c["card_id"],
        })
    else:  # PRACTICE
        title, effect = PRACTICE_COPY.get(arch, (c.get("title") or "PRACTICE", ""))
        rows.append({
            "print_ref": f"CARD-{i:03d}", "deck_label": label, "band_color": band,
            "owner_table": owner, "title": title, "counterparty": "",
            "amount": "", "vat": "", "format_note": "",
            "body_lines": effect, "qr_payload": c.get("qr", ""), "card_id": c["card_id"],
        })

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
print(f"wrote {len(rows)} rows -> {OUT}")
# sanity: every row has a qr payload
missing = [r["card_id"] for r in rows if not r["qr_payload"]]
print("rows missing qr:", len(missing))
