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
