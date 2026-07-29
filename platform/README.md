# Five-Corner Compliance Simulation — Platform

Kamel Pay × Beyond Plus. Spec: parent folder `02_Platform_PRD.md`. Standing rules: `AGENTS.md`.

## Quick start (local memory store)

```bash
pnpm install
pnpm test
pnpm seed:dry
pnpm dev
# then POST /api/seed once, or open any page — memory auto-seeds from data/cards_seed.json
```

Without `POSTGRES_URL`, the app uses an in-memory store seeded from `data/cards_seed.json` (verbatim PINs). Production **must** use Vercel Postgres + `pnpm seed`.

## Production

1. Set env from `.env.example` (`POSTGRES_URL`, KV, `FACILITATOR_PIN`, domain, event date).
2. Deploy to Vercel region `fra1` (see `vercel.json`).
3. `POSTGRES_URL=… pnpm seed`
4. Facilitator: `/console` → advance phases. Projection: `/projection`.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm test` | Exhaustive `lib/scoring.ts` unit tests |
| `pnpm seed:dry` | Validate seed file without DB |
| `pnpm seed` | Apply schema + seed Postgres |
| `pnpm loadtest` | Concurrent client harness against a running server |

## Scanner testing

`getUserMedia` requires HTTPS. Test the Tax scanner only via Vercel preview or `ngrok http 3000` on a real phone. Desktop webcam does not count.
