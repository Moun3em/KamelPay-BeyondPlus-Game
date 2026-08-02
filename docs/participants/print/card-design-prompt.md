# CARD PRINT DESIGN — MASTER PROMPT FOR CLAUDE DESIGN (v2 — KamelPay visual language)

**How to use:** paste everything below the line into Claude Design, and attach `card_print_data.csv` (same folder). The prompt is self-contained — you do not need to know anything about the exercise the cards belong to, and you must not ask. Everything you may print is in the CSV. Nothing else.

---

You are a print designer. You will design and render **210 high-quality physical cards** from the attached data file `card_print_data.csv`. Each card is a business document used in a workshop exercise. Participants read each card and make a decision about it — so the card must present ONLY what is in the CSV, exactly as written, with no added commentary.

## Visual language (the "KamelPay" system — apply to every card)
- **Palette:** ink `#0A1628` · navy `#12305A` · signal blue `#1A7AE5` · signal-deep `#0D5BB5` · heat orange `#F07A00` · heat-deep `#C45F00` · paper `#F4F7FB` · mist `#E4ECF6` · white `#FFFFFF` · muted `#5A6B82`. Deck band colors come from the CSV's `band_color` column (INVOICE = heat orange, CONTROL = green `#1E8E5A`, ALLIANCE = signal blue, PRACTICE = muted grey).
- **Type:** Outfit for display (titles, band labels), Source Sans 3 for body, IBM Plex Mono for metadata (card ID, labels, indexes). Load from Google Fonts; embed for print.
- **Aesthetic:** premium, confident, editorial — like the cover of a serious financial product. Deep navy + warm orange accents on clean white/paper. Generous whitespace, hairline rules, small mono labels. The card must look like a real, high-end business document — never like a toy, never like a flashcard.
- **Color is decoration, never information.** The visual system is identical across every card in a deck; only the data differs. Make it beautiful — then make it strictly uniform.

## What you do not need to know
You do not know — and must not infer or print — the correct decision for any card. You are given the text to print; you print it. Do not add, remove, reorder, or "improve" any value. Do not label cards as good/bad/correct/incorrect in any way.

## Card specification (hard, fixed)
- **Size:** 90 × 140 mm (large tarot) — non-negotiable
- **Resolution/print:** 300 dpi final export, 3 mm bleed all round, crop marks on the sheets, 3 mm rounded corners, matte laminate finish (gloss creates glare and defeats phone scanning). Rich color (RGB) for digital print; supply CMYK separation notes for offset if requested.
- **Body text:** 16 pt minimum — the audience reads in ambient light at arm's length. Metadata/labels may be 10–12 pt mono, uppercase.
- **Deck band:** a full-width color band across the top of the card using `band_color`, with the `deck_label` word in white Outfit bold inside it, plus a small white icon (INVOICE = document sheet, CONTROL = shield, ALLIANCE = interlocking nodes, PRACTICE = open book). Icon + word — color is never the only signal.

## Fixed card anatomy (every card, top to bottom)
1. **Deck band** (full width, 16 mm tall): `band_color` + white `deck_label` + its icon
2. **Owner badge:** `owner_table` (e.g. T-03) — a small navy pill, top-right corner under the band, white mono text
3. **Title:** `title` — Outfit 800, ~20 pt, ink
4. **Counterparty line:** `counterparty` (when present) — Source Sans 3, 16 pt, navy
5. **Amount block:** `amount` + `vat` (when present) — amount in ink, tabular numerals; VAT line in muted
6. **Fields block:** `body_lines` — semicolon-separated `Label: value` pairs, each its own row: label in muted mono small-caps, value in navy. Rows separated by hairline rules (`rgba(18,48,90,0.12)`). The `—` character is an empty field and renders as an em-dash with exactly the same weight as any value. Same row count and layout on every card in a deck.
7. **Format note:** `format_note` (when present) — one quiet mono metadata row above the QR block
8. **QR block (bottom-right, the signature element):** a **white chip panel** — white background, 1 px navy frame with small corner brackets in the deck's `band_color` — containing the **QR code in pure black on pure white** (28 × 28 mm minimum, 4-module quiet zone inside the chip), with `card_id` printed directly beneath it in 10 pt IBM Plex Mono (the manual fallback — must be legible). The chip is the ONLY colored frame on the card; everything inside it stays pure black/white.

## QR rules (hard — this is the primary scan input)
- The QR encodes exactly the `qr_payload` string. Render a REAL, scannable QR from that string — never a placeholder, pattern, or decoration.
- **Pure black modules on pure white background.** No tinting, no rounded module corners, no logo overlay, no colored quiet zone. The white chip guarantees this.
- Verify scannability before delivery (spot-check at least 5 payloads with a phone at arm's length).

## Layout rules (hard)
- **All cards in the same deck are visually identical in structure** — same zones, positions, type sizes, colors, band, chip. The only differences between cards are the DATA values. A card must never look "different" from its deck-mates for any reason.
- **Never add:** status words (PRESENT, COMPLETE, VALID, INVALID, APPROVED, REJECTED, MISSING, OK), checkmarks, crosses, stamps, seals, badges (beyond the owner pill), ribbons, highlights, gradients, or any visual emphasis on any field. No card may appear "special" or "suspicious".
- The `—` em-dash values are ordinary data — same weight as any value.
- Decorations are allowed only where they are deck-level and identical across the deck (band, chip brackets, hairline rules, the page geometry). Nothing per-card except the data.

## Data rules (hard)
- The CSV has 210 rows (header + 210). Render **every row**. Do not skip, duplicate, or reorder.
- Every value comes from the CSV. Never invent a counterparty, amount, date, reference, TRN, or QR payload. Empty cells = skip that element.
- `print_ref` (CARD-001 … CARD-210) is your internal reference — print it tiny on the bleed margin outside the card area (cut away), never on the card face.

## Deliverables
1. The INVOICE template proof first: deck band + icon, owner pill, title, amount block, fields block, format note, and the QR chip — at true 90 × 140 mm scale, interactive HTML preview with a data switcher.
2. **All 210 cards rendered** — print-ready sheets (A4, 2 cards per sheet, 3 mm bleed, crop marks), grouped by deck (INVOICE 100, CONTROL 60, ALLIANCE 40, PRACTICE 10).
3. A downloadable 300 dpi PDF of the full sheet set.
4. A one-page printer spec (zones + measurements + color values + finish).
5. Handoff confirmation: all 210 rows rendered, QR payloads scannable (spot-checked), no status words or emphasis added anywhere, deck-uniformity verified.

Start with the INVOICE template proof.
