import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import AUTH_DISABLED, require_auth, verify_google_token, ALLOWED_EMAILS
from .llm import call_llm
from .schemas import LLMResult, RunCreate

app = FastAPI(title="Synthetic Sampler")

origins = ["http://localhost:5173"]
frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/verify")
async def auth_verify(body: dict) -> dict:
    """Verify a Google ID token and check the email against the allowlist."""
    if AUTH_DISABLED:
        return {"email": "dev@local", "allowed": True}

    token = body.get("credential", "")
    if not token:
        return {"email": "", "allowed": False}

    try:
        payload = verify_google_token(token)
    except Exception:
        return {"email": "", "allowed": False}

    email = payload.get("email", "")
    allowed = not ALLOWED_EMAILS or email in ALLOWED_EMAILS
    return {"email": email, "allowed": allowed}


async def _run_one(request: RunCreate) -> LLMResult:
    payload = await call_llm(
        request.persona,
        request.situation,
        request.information,
        request.question,
    )
    answer = str(payload.get("answer", ""))
    reason = str(payload.get("reason", ""))
    return LLMResult(answer=answer, reason=reason, raw_output=payload)


@app.post("/runs")
async def create_run(request: RunCreate, _user=Depends(require_auth)) -> LLMResult:
    return await _run_one(request)
