# Synthetic Sampler

Synthetic sampler to mock human respondents for market surveys.
Uses Worldview, Social Context, Psychological factors to the endow the LLM "human" concerns.
Based on the paper; https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4880894

https://synthetic-sampler-frontend.onrender.com/
## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set OPENAI_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port ${PORT:-10000}
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes
- Run-once hits `/runs`.
- Render web services should bind to `0.0.0.0` and the `PORT` env var (default `10000`).
