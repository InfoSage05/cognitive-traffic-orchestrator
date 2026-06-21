# Cognitive Traffic Orchestrator — Dashboard

A plain Vite + React (TypeScript) single-page app that visualizes the Python
pipeline in `../cognitive-traffic-orchestrator` (risk index, LightGBM
duration predictor, nearest-neighbour RAG dispatch recommender) via a small
FastAPI JSON layer (`../cognitive-traffic-orchestrator/src/app/api.py`).

This is a standalone Vite/React app, not the original Lovable-hosted
TanStack Start scaffold — `@lovable.dev/*` packages live in Lovable's private
npm registry and only resolve inside Lovable's sandbox, so this port drops
that wrapper (and TanStack Router, which had only one route to begin with)
in favor of a setup that installs and runs anywhere.

The Route Intelligence / Google Maps tab has been dropped for now (it
needed a paid Google Maps API key and wasn't backed by project data) —
the remaining tabs are Overview, Event Feed, Model Matrix, Dispatch,
Pipeline, and Settings.

## 1. Start the backend first

The frontend has nothing to show without it.

```powershell
cd ../cognitive-traffic-orchestrator
.\.venv\Scripts\Activate.ps1
uvicorn src.app.api:app --reload --port 8000
```

Verify it's up: open `http://localhost:8000/api/health` in a browser — you
should see `{"status":"ok","predictorTrained":true}`. Also try
`http://localhost:8000/api/dashboard/summary`, which should return real
counts/percentages computed from `Theme_2_dataset.csv` (the
`historicalEventCount` field should be in the thousands, not 0).

## 2. Install and run the frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

`.env` only needs `VITE_API_BASE_URL` (defaults to `http://localhost:8000`,
matching the command above).

`npm run dev` prints a local URL, normally `http://localhost:5173` — open
that in a browser. Vite hot-reloads on every file save, so once it's
running you can leave it open while iterating.

## How to check it's actually wired up (not just rendering mock UI)

1. Go to the **Event Feed** tab and click **Trigger mock event**. A new card
   should appear with a real corridor name (e.g. "Tumkur Road", "Mysore
   Road" — these come from `src/agents/spatial_agent.py`'s 22-corridor list)
   and a risk/clearance number next to it.
2. Switch to **Model Matrix** — it should now show that same event's risk
   score, predicted duration, and a dispatch brief with a manpower count and
   similar historical cases pulled from the SQLite warehouse.
3. Click **Deploy Field Alert** on that brief, then switch to **Dispatch** —
   the alert you just sent should appear at the top of the list.
4. Go to **Overview** — the KPI cards and charts are aggregated live from
   the ~8,000-row historical dataset (`Theme_2_dataset.csv`), not hardcoded.
   If you stop the backend and refresh, these revert to "—" instead of
   silently showing fake numbers.
5. Open the FastAPI interactive docs at `http://localhost:8000/docs` to see
   and try every endpoint directly, independent of the frontend.

## What's live vs illustrative

- **Live (backed by `src/app/api.py`, real historical/session data)**:
  Event Feed (trigger + list), Model Matrix (risk score, predicted duration,
  RAG recommendation, dispatch), Dispatch Channel (real dispatch log),
  Overview KPIs/charts (aggregated from the historical SQLite dataset).
- **Illustrative only (no backing metric yet)**: the Agent Health bars on
  Overview, the qualitative feedback log on the Dispatch tab, and the whole
  Pipeline/Settings tabs.
