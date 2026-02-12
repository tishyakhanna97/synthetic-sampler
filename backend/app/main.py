import os
import uuid as uuid_mod
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import AUTH_DISABLED, ALLOWED_EMAILS, require_auth, verify_google_token
from .database import Run, create_tables, get_session
from .llm import call_llm
from .schemas import LLMResult, RunCreate, RunResponse

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


@app.on_event("startup")
async def startup():
    await create_tables()


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


@app.post("/runs", response_model=RunResponse)
async def create_run(
    request: RunCreate,
    batch_id: Optional[str] = Query(None),
    user=Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> RunResponse:
    result = await _run_one(request)

    parsed_batch_id = uuid_mod.UUID(batch_id) if batch_id else None

    run = Run(
        user_email=user.get("email", "unknown"),
        batch_id=parsed_batch_id,
        inputs=request.model_dump(),
        parameters={},
        answer=result.answer,
        reason=result.reason,
        raw_output=result.raw_output,
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)

    return RunResponse.model_validate(run)


@app.get("/runs", response_model=list[RunResponse])
async def list_runs(
    batch_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user=Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> list[RunResponse]:
    email = user.get("email", "unknown")
    stmt = select(Run).where(Run.user_email == email)

    if batch_id:
        stmt = stmt.where(Run.batch_id == uuid_mod.UUID(batch_id))

    stmt = stmt.order_by(Run.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    runs = result.scalars().all()
    return [RunResponse.model_validate(r) for r in runs]


@app.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    user=Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> RunResponse:
    stmt = select(Run).where(Run.id == uuid_mod.UUID(run_id))
    result = await session.execute(stmt)
    run = result.scalar_one_or_none()

    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.user_email != user.get("email", "unknown"):
        raise HTTPException(status_code=403, detail="Not your run")

    return RunResponse.model_validate(run)
