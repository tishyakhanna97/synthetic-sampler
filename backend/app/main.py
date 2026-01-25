from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .llm import call_llm
from .schemas import LLMResult, RunCreate

app = FastAPI(title="Synthetic Sampler")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


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
async def create_run(request: RunCreate) -> LLMResult:
    return await _run_one(request)
