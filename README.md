# nuansic

AI-powered color palettes for designers who know what they want.

TanStack Start (React 19 + Vite) frontend, FastAPI palette backend, Supabase for
auth / saved palettes / billing.

## Prerequisites

- **Node.js 20+** (developed on Node 24) and npm.
  The repo also ships `bun.lock` / `bunfig.toml` and Netlify builds with
  `bun run build`, but **npm works fine locally** — Bun is optional.
- **Python 3.10+** for the palette backend (developed on 3.14).
- A Supabase project for auth / saved palettes / billing.

> On Windows, PowerShell may block `npm` with
> *"npm.ps1 cannot be loaded because running scripts is disabled"*
> (`Get-ExecutionPolicy` returns `Undefined`/`Restricted`).
> Use `npm.cmd run dev` instead, or set
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## 1. Frontend

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Then open **http://localhost:8080**.

> The port is **8080**, not Vite's usual 5173 — `vite.config.ts` uses
> `@lovable.dev/vite-tanstack-config`, which pins `host: "::", port: 8080`
> even outside the Lovable sandbox. `src/lib/color-ai.ts` also defaults its
> API URL to `http://localhost:8000`.

### Environment variables

`.env` is gitignored; `.env.example` is the committed template.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase project URL. This repo is linked to project `nuansic` (`ytcrwptydggdeooeppyu`). |
| `VITE_SUPABASE_ANON_KEY` | yes | Anon / publishable key — Dashboard → Project Settings → API Keys. Client-side safe; RLS enforces access. |
| `VITE_PALETTE_API_URL` | no | FastAPI backend base URL. Defaults to `http://localhost:8000`. |

Every `VITE_*` var is inlined into the **client bundle**, so never put a
service-role / secret key in one.

Without Supabase credentials the app still boots — `src/lib/supabase-client.ts`
logs a warning and auth, saved palettes, profile and billing fail at call time.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:8080 |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## 2. Palette backend (optional)

Only needed for palette generation. Without it the site loads fine, but
"generate palette" fails.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn palette_api:app --reload
```

Serves on http://localhost:8000. Endpoints: `POST /extract-colors`,
`POST /generate-palette`.

Optional env vars:

- `ALLOWED_ORIGINS` — comma-separated CORS allowlist. Defaults to
  `http://localhost:3000`, `http://localhost:5173`, `http://nuansic.me`, so
  local dev works out of the box. **Must** be set to the real frontend
  domain(s) in production.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — enable the daily generation
  quota. Leave unset locally: the backend fails **open**, so generation works
  without limit instead of erroring.

## 3. Database & Edge Functions

Auth, saved palettes, notifications and billing need the SQL applied to the
linked Supabase project (`supabase/schema.sql`, then the
`supabase/migration_*.sql` files) — via the dashboard SQL editor or
`supabase db push`.

The upgrade flow also requires the `supabase/functions/create-checkout` and
`supabase/functions/stripe-webhook` Edge Functions to be deployed, with
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `SITE_URL` set as secrets.

## Project layout

```
src/
  routes/               file-based routes (routeTree.gen.ts is generated — don't edit)
  components/nuansic/   app UI
  components/auth/      login / signup / password reset
  components/ui/        shadcn/ui primitives
  lib/                  supabase client, color AI client, auth hooks
backend/                FastAPI palette engine (rule-based color theory)
supabase/               SQL schema/migrations + Edge Functions
```


