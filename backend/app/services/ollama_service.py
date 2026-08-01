"""
Ollama service — calls a locally running Ollama server to extract
structured symptom data from free-text user input.

Requires Ollama running on the host:
  ollama serve
  ollama pull llama3   (or whichever model is configured in .env)
"""

import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings
from app.models.schemas import OllamaExtractedPayload

logger = logging.getLogger(__name__)

# ── Prompt template ────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are a compassionate, expert medical assistant specialised in
menstrual and reproductive health. Your task is to analyse free-text symptom
descriptions and return structured JSON only — no explanation, no markdown fences.

Return exactly this JSON schema:
{
  "symptoms": [
    {
      "symptom_name": "<string>",
      "body_area": "<string or null>",
      "intensity": <integer 1-10 or null>,
      "duration_days": <float or null>,
      "notes": "<string or null>",
      "category": "<mood | skin | pain | energy | digestive | sleep | other or null>",
      "severity_score": <integer 1-5 or null>
    }
  ],
  "severity": "<mild | moderate | severe>",
  "summary": "<one sentence summary>"
}

Rules:
- severity is "mild" if manageable at home, "moderate" if noticeably impacting daily life,
  "severe" if urgent or potentially requiring immediate medical attention.
- Extract every distinct symptom mentioned.
- category must be one of: mood, skin, pain, energy, digestive, sleep, other.
- severity_score is a 1-5 scale (1=minimal, 5=extreme) for each individual symptom.
- If a field cannot be inferred, use null.
- Respond with valid JSON only.
"""


def _parse_json_from_response(text: str) -> dict:
    """
    Try to extract the first JSON object from the model's response.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    # Strip markdown fences if present
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    # Find the outermost { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in Ollama response: {text[:200]!r}")
    return json.loads(match.group())


async def extract_symptoms_with_ollama(
    raw_text: str,
    timeout: float = 60.0,
) -> OllamaExtractedPayload:
    """
    Send ``raw_text`` to Ollama and return a validated OllamaExtractedPayload.

    Raises:
        httpx.HTTPError: if the Ollama server is unreachable or returns an error.
        ValueError: if the model returns malformed JSON.
        pydantic.ValidationError: if the JSON doesn't match the expected schema.
    """
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": raw_text},
        ],
    }

    logger.debug("Calling Ollama model=%s url=%s", settings.OLLAMA_MODEL, url)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

    data = response.json()
    # Ollama /api/chat returns {"message": {"role": "assistant", "content": "..."}}
    content: str = data["message"]["content"]
    logger.debug("Ollama raw response: %s", content[:500])

    raw_dict = _parse_json_from_response(content)
    return OllamaExtractedPayload(**raw_dict)


def extract_symptoms_sync(
    raw_text: str,
    timeout: float = 60.0,
) -> OllamaExtractedPayload:
    """
    Synchronous wrapper around the Ollama call — useful for testing without an
    async event loop, or for Celery tasks.
    """
    import asyncio

    return asyncio.run(extract_symptoms_with_ollama(raw_text, timeout=timeout))
