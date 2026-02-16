# Synthetic Sampler

## Overview
A web app that prompts an LLM with a configurable persona, social context, psychological factors, and question, then returns a structured JSON answer. Used for research on synthetic survey responses.

## Architecture
- **Frontend**: React (Vite) — `frontend/`
- **Backend**: FastAPI (Python 3.11) — `backend/`
- **LLM**: Google Gemini via `google-genai` SDK (`gemini-3-flash-preview`)
- **Auth**: Google OAuth (Identity Services popup flow)
- **Database**: PostgreSQL (Supabase in prod, local container for dev) via async SQLAlchemy + asyncpg
- **Deployment**: Render (backend as Docker web service, frontend as static site)
- **Local dev**: Docker Compose (`docker-compose.yml`)

## Project Structure
```
backend/
  app/
    main.py        — FastAPI app, routes: GET /health, POST /auth/verify, POST /runs, GET /runs, GET /runs/{id}
    llm.py         — Gemini LLM call, prompt builder, JSON extraction
    schemas.py     — Pydantic models: RunCreate, LLMResult, RunResponse
    auth.py        — Google OAuth token verification, require_auth dependency
    database.py    — Async SQLAlchemy engine, Run ORM model, session dependency
  Dockerfile       — Python 3.11 slim, uvicorn
  requirements.txt
  .env / .env.example

frontend/
  src/
    App.jsx        — Main component: auth flow, tab navigation (New Run / History), form + results
    RunHistory.jsx — History tab: fetches last 10 runs, renders as table with all fields
    main.jsx       — React entry point
    styles.css     — Styles (includes tab nav and runs table)
  index.html       — Includes Google Identity Services script
  Dockerfile       — Node 20, vite dev server
  .env

docker-compose.yml — Local dev: postgres (port 5432) + backend (port 8000) + frontend (port 5173)
```

## Key Patterns

### Authentication
- `AUTH_DISABLED=true` (backend) + `VITE_AUTH_DISABLED=true` (frontend) bypasses all auth for local dev
- Production: Google OAuth popup flow, backend verifies ID token, any valid Google account is allowed
- `POST /auth/verify` — frontend sends Google credential, backend returns `{email, allowed}`
- `POST /runs` is protected by `Depends(require_auth)` — requires `Authorization: Bearer <token>`
- On 401/403, frontend clears credential and shows login screen

### LLM Integration
- Uses `google.genai.Client()` with async `aio.models.generate_content`
- Prompt asks LLM to respond as JSON with `answer` and `reason` keys
- `_extract_json` handles both clean JSON and JSON embedded in markdown fences

### Database
- Async SQLAlchemy with `asyncpg` driver
- Single `runs` table: stores every LLM run with JSONB `inputs` and `parameters` columns for schema flexibility
- `batch_id` (nullable UUID) groups iterations of the same config for batch runs
- `create_tables()` runs on startup (uses IF NOT EXISTS, safe to call repeatedly)
- Graceful degradation: if `DATABASE_URL` is not set, DB features are disabled
- Local dev: Postgres 16 container via Docker Compose (port 5432, db `synthetic_sampler`)
- Production: Supabase (free hosted PostgreSQL) — set `DATABASE_URL` in Render env vars (use Session Pooler URI for Render IPv4 compatibility)
- Single shared database for all users; `GET /runs` returns runs from all users (no per-user filtering)

### Frontend
- Tab navigation: "New Run" (form + results) and "History" (last 10 runs table)
- History table shows: created time, user email, persona, situation, information, question, answer, reason, batch ID, run ID
- Google Sign-In button only initializes when not authenticated (prevents re-render after login)

## Environment Variables

### Backend
| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Prod | OAuth client ID |
| `FRONTEND_URL` | Prod | Frontend URL for CORS |
| `AUTH_DISABLED` | Dev only | Set `true` to skip auth |
| `GEMINI_MODEL` | No | Defaults to `gemini-3-flash-preview` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase in prod, local container for dev) |

### Frontend
| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | Yes | Backend URL |
| `VITE_GOOGLE_CLIENT_ID` | Prod | OAuth client ID |
| `VITE_AUTH_DISABLED` | Dev only | Set `true` to skip auth |

## Commands
```bash
# Local dev with Docker
docker compose up --build

# Backend only (without Docker)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend only (without Docker)
cd frontend && npm install && npm run dev
```

## Deployment (Render)
- **Backend**: Docker web service, root directory `backend/`, port 8000
- **Frontend**: Static site, root directory `frontend/`, build cmd `npm run build`, publish dir `dist`
- Production must NOT set `AUTH_DISABLED` or `VITE_AUTH_DISABLED`
- Google OAuth origins must include the production frontend URL
