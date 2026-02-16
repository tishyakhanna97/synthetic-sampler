import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai


load_dotenv()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

client = genai.Client()


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


VALID_ANSWERS = {"Yes", "No", "Unknown"}


def build_prompt(persona: str, situation: str, information: str, question: str) -> str:
    return (
        "You are given a persona and a situation. Answer the question.\n"
        "Your answer MUST be exactly one of: Yes, No, Unknown. No other value is accepted.\n"
        "Provide a brief reason for your choice.\n"
        "Respond ONLY as JSON with keys: answer, reason.\n\n"
        f"Persona: {persona}\n"
        f"Situation: {situation}\n"
        f"Information: {information}\n"
        f"Question: {question}\n"
    )


async def call_llm(persona: str, situation: str, information: str, question: str) -> dict[str, Any]:
    prompt = build_prompt(persona, situation, information, question)
    response = await client.aio.models.generate_content(
        model=MODEL_NAME, contents=prompt
    )
    payload = _extract_json(response.text)
    raw_answer = str(payload.get("answer", "")).strip().capitalize()
    if raw_answer not in VALID_ANSWERS:
        raw_answer = "Unknown"
    payload["answer"] = raw_answer
    return payload
