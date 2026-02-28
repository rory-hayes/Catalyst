# Blueprint Workspace v1

Catalyst-powered deal execution workspace with HubSpot as system of record.

## Stack

- Next.js (App Router) + React + Tailwind
- Prisma + Postgres (Supabase-compatible)
- BullMQ + Redis (Upstash-compatible)
- HubSpot connector (read/write)
- Supabase-ready auth scaffolding (Google SSO + magic link)

## Features implemented

- Dashboard Home with KPI cards, deal grid, stale/escalation queues
- Deals Grid with inline draft editing and pending-change behavior
- Deal Dossier with:
  - Refresh + Sync actions
  - Sync Preview modal
  - Lens-aware summary + module editing
  - Update Composer (markdown + structured metadata)
  - Timeline stream
- Templates admin page with role templates/modules/field mappings
- Notification Center (in-app reminders)
- Full API route surface from plan
- Queue worker for refresh/sync jobs with retry + idempotent write log
- EOD cron dispatch endpoint (weekday local-time scheduling)

## Quick start

1. Install Node (if needed) and dependencies.
2. Copy env template:

```bash
cp .env.example .env
```

3. Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

4. Seed local data:

```bash
npm run db:seed
```

5. Start app and worker in separate terminals:

```bash
npm run dev
npm run worker
```

6. Optional: trigger EOD dispatcher manually:

```bash
curl -X POST http://localhost:3000/api/cron/eod-dispatch \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Deployments

### Vercel

This app needs a real Postgres connection in Vercel env vars or pages/APIs will return setup errors.

Required vars:
- `DATABASE_URL`
- `REDIS_URL` (only required if running queue-backed sync)
- `CRON_SECRET` (for `/api/cron/eod-dispatch`)

Deploy command:

```bash
vercel deploy -y
```

### Render

Use the included Blueprint:

```bash
render blueprints validate render.yaml
```

Then create services in Render Dashboard from `render.yaml`. Blueprint provisions:
- `blueprint-postgres` (managed Postgres)
- `blueprint-redis` (managed Key Value/Redis)
- `blueprint-web` (Next.js app)
- `blueprint-worker` (BullMQ worker)
- `blueprint-eod-dispatch` (hourly cron trigger)

## Scripts

- `npm run dev` - Next.js dev server
- `npm run worker` - BullMQ worker (refresh/sync)
- `npm run build` - production build
- `npm run lint` - ESLint
- `npm run test` - unit/integration tests (Vitest)
- `npm run test:e2e` - Playwright e2e
- `npm run db:generate` - Prisma client generation
- `npm run db:push` - Apply schema to DB
- `npm run db:seed` - Seed demo workspace data

## API endpoints

Implemented under `/src/app/api`:

- `GET /api/dashboard?range=...`
- `GET /api/deals`
- `GET /api/deals/:id`
- `PATCH /api/deals/:id/grid-edit`
- `PATCH /api/deals/:id/summary`
- `POST /api/deals/:id/updates`
- `POST /api/deals/:id/refresh`
- `GET /api/deals/:id/sync-preview`
- `POST /api/deals/:id/sync`
- `GET /api/templates`
- `POST /api/templates`
- `PATCH /api/templates/:id`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/admin/mappings`
- `POST /api/cron/eod-dispatch`

## Notes

- HubSpot token storage is scaffolded with `encryptedAccessToken` fields; plug in KMS/crypto envelope encryption before production.
- Salesforce/Calendar/Gong/Drive connectors are intentionally deferred to later phases.
