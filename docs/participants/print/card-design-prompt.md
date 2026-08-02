# CARD PRINT DESIGN — MASTER PROMPT FOR CLAUDE DESIGN

**How to use:** paste everything below the line into Claude Design, and attach `card_print_data.csv` (same folder). The prompt is self-contained — you do not need to know anything about the exercise the cards belong to, and you must not ask. Everything you may print is in the CSV. Nothing else.

---

You are a print designer. You will design and render **210 physical cards** from the attached data file `card_print_data.csv`. Each card is a business document used in a workshop exercise. Participants will read each card and make a decision about it — so the card must present ONLY what is in the CSV, exactly as written, with no added commentary.

## What you do not need to know
You do not know — and must not infer or print — the correct decision for any card. You are given the text to print; you print it. Do not add, remove, reorder, or "improve" any value. Do not label cards as good/bad/correct/incorrect in any way.

## Card specification (hard, fixed)
- **Size:** 90 × 140 mm (large tarot) — non-negotiable
- **QR code:** 28 × 28 mm minimum, pure black modules on pure white background, 4-module quiet zone around it. Never place the QR on a colored or textured field, never add a logo or label inside the QR area, never decorate it. The `qr_payload` column is the exact content the QR must encode — render a REAL, scannable QR from that string (do not use a placeholder or decorative pattern). Verify it scans before delivery.
- **Corners:** 3 mm rounded · **Bleed:** 3 mm all round · **Finish:** matte (no gloss)
- **Body text:** 16 pt minimum — the audience reads in ambient light at arm's length
- **Deck band:** a full-width band across the top of the card, color from `band_color`, with the `deck_label` word printed inside it (icon + word; color is never the only signal)

## Fixed card anatomy (every card, top to bottom)
1. **Deck band** (full width): `deck_label` — INVOICE, CONTROL, ALLIANCE, or PRACTICE
2. **Owner badge:** `owner_table` (e.g. T-03) — top-right corner, small, quiet
3. **Title:** `title` — bold, prominent (18–20 pt)
4. **Counterparty line:** `counterparty` (when present)
5. **Amount block:** `amount` + `vat` (when present) — tabular numerals, left-aligned
6. **Fields block:** `body_lines` — a semicolon-separated list of `Label: value` pairs. Render each pair as its own row: label in muted small caps, value in regular weight. The `—` character means an empty field and must render as an em-dash. Keep the same row count and layout on every card in the same deck.
7. **Format note:** `format_note` (when present) — a quiet one-line metadata row above the QR
8. **QR block (bottom-right):** the QR code with `card_id` printed directly under it in 9–10 pt monospace (this is the manual fallback for the scanner — it must be legible)

## Layout rules (hard)
- **All cards in the same deck are visually identical in structure** — same zones, same positions, same type sizes, same colors. The only differences between cards are the DATA values. A card must never look "different" from its deck-mates for any reason.
- **Never add:** status words (PRESENT, COMPLETE, VALID, INVALID, APPROVED, REJECTED, MISSING, OK), checkmarks, crosses, stamps, badges, seals, borders, highlights, or any visual emphasis on any field. No green/red tinting. No card may appear "special" or "suspicious".
- The `—` (em-dash) values are ordinary data. Render them with exactly the same weight as any other value.

## Brand
- Palette: primary indigo `#5F59F7`, CTA blue `#0059F7`, ink `#000D1E`, surface `#F4F6FB`, white `#FFFFFF`. Deck band colors come from the CSV's `band_color` column (INVOICE = signal red, CONTROL = green, ALLIANCE = blue, PRACTICE = neutral grey).
- Type: Raleway for display, Open Sans for body (fallback: Calibri/Arial).
- Aesthetic: clean, premium, generous whitespace — Apple-like. The card looks like a real, professional business document.

## Data rules (hard)
- The CSV has 210 rows (header + 210). Render **every row**. Do not skip, duplicate, or reorder.
- Every value comes from the CSV. Never invent a counterparty, amount, date, reference, TRN, or QR payload. If a cell is empty, leave the zone empty (skip that element).
- `print_ref` (CARD-001 … CARD-210) is your internal reference — print it tiny on the bleed margin outside the card area (cut away), never on the card face.
- The QR must encode exactly the `qr_payload` string.

## Deliverables
1. The card template as an interactive HTML preview (90 × 140 mm at true scale) showing the anatomy, with a live data switcher.
2. **All 210 cards rendered** — as print-ready sheets (A4, 2 cards per sheet, 3 mm bleed, crop marks), grouped by deck (INVOICE 100, CONTROL 60, ALLIANCE 40, PRACTICE 10).
3. A downloadable PDF of the full sheet set.
4. A one-page spec summary of the layout (zones + measurements) for the printer.
5. Confirm in your handoff: QR payloads are scannable (spot-check at least 5), all 210 rows rendered, no status words or emphasis added anywhere.

Start with the INVOICE template proof (deck band, QR block, owner badge, fields block) before producing the set.
