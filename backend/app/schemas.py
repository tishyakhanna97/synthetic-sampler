from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RunCreate(BaseModel):
    persona: str
    situation: str
    information: str
    question: str


class BatchRunCreate(BaseModel):
    persona: str
    situation: str
    information: str
    question: str
    iterations: int = Field(ge=1, le=10, default=1)


class LLMResult(BaseModel):
    answer: str
    reason: str
    raw_output: dict


class RunResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_email: str
    batch_id: Optional[UUID] = None
    inputs: dict
    parameters: dict
    answer: str
    reason: str
    raw_output: dict
    created_at: datetime


class BatchRunResponse(BaseModel):
    batch_id: UUID
    runs: list[RunResponse]
    summary: dict
