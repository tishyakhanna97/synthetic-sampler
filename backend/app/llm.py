import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI


load_dotenv()

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def build_prompt(persona: str, situation: str, information: str, question: str) -> str:
    return (
        "You are given a persona and a situation. Answer the question with a short answer "
        "and a brief reason. Respond ONLY as JSON with keys: answer, reason.\n\n"
        f"Persona: {persona}\n"
        f"Situation: {situation}\n"
        f"Information: {information}\n"
        f"Question: {question}\n"
    )


async def call_llm(persona: str, situation: str, information: str, question: str) -> dict[str, Any]:
    prompt = build_prompt(persona, situation, information, question)
    llm = ChatOpenAI(model=MODEL_NAME, temperature=0.2)
    response = await llm.ainvoke(prompt)
    payload = _extract_json(response.content)
    return payload
