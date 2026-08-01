"""
Unit tests for app.services.ollama_service.

These tests mock the HTTP call so they run without a live Ollama server.
Run with:  pytest backend/tests/test_ollama_service.py -v
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ollama_service import _parse_json_from_response, extract_symptoms_with_ollama


# ── _parse_json_from_response ──────────────────────────────────────────────

class TestParseJsonFromResponse:
    def test_clean_json(self):
        raw = '{"symptoms": [], "severity": "mild", "summary": "ok"}'
        result = _parse_json_from_response(raw)
        assert result["severity"] == "mild"

    def test_json_wrapped_in_markdown_fence(self):
        raw = """```json
        {"symptoms": [], "severity": "moderate", "summary": "text"}
        ```"""
        result = _parse_json_from_response(raw)
        assert result["severity"] == "moderate"

    def test_raises_on_no_json(self):
        with pytest.raises(ValueError, match="No JSON object found"):
            _parse_json_from_response("This is plain text with no JSON.")


# ── extract_symptoms_with_ollama ───────────────────────────────────────────

MOCK_OLLAMA_RESPONSE = {
    "model": "llama3",
    "message": {
        "role": "assistant",
        "content": json.dumps({
            "symptoms": [
                {
                    "symptom_name": "cramps",
                    "body_area": "lower abdomen",
                    "intensity": 8,
                    "duration_days": 2.0,
                    "notes": None,
                }
            ],
            "severity": "moderate",
            "summary": "Moderate menstrual cramps.",
        }),
    },
}


@pytest.mark.asyncio
async def test_extract_symptoms_returns_payload():
    """Happy-path: Ollama returns valid JSON → parsed OllamaExtractedPayload."""
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_OLLAMA_RESPONSE
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.ollama_service.httpx.AsyncClient", return_value=mock_client):
        payload = await extract_symptoms_with_ollama("I have bad cramps for 2 days")

    assert payload.severity == "moderate"
    assert len(payload.symptoms) == 1
    assert payload.symptoms[0].symptom_name == "cramps"
    assert payload.symptoms[0].intensity == 8


@pytest.mark.asyncio
async def test_extract_symptoms_raises_on_http_error():
    """Ollama server unreachable → httpx.HTTPError propagates."""
    import httpx

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

    with patch("app.services.ollama_service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(httpx.ConnectError):
            await extract_symptoms_with_ollama("test input")
