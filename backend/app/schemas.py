from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RunCreate(BaseModel):
    persona: str
    situation: str
    information: str
    question: str


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
