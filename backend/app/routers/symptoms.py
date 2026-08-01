"""
Symptoms router — handles all symptom-log CRUD endpoints.

POST /api/log-symptom   Submit free-text symptoms → LLM extraction → DB save
GET  /api/logs          Paginated list of symptom logs
GET  /api/logs/{id}     Single symptom log by id
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    SymptomLogCreate,
    SymptomLogListOut,
    SymptomLogOut,
)
from app.services import ollama_service, symptom_service
from app.services.triage_engine import run_triage

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /api/log-symptom ──────────────────────────────────────────────────

@router.post(
    "/log-symptom",
    response_model=SymptomLogOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a symptom description",
)
async def log_symptom(
    body: SymptomLogCreate,
    db: Session = Depends(get_db),
):
    """
    Accept free-text symptom input, run Ollama LLM extraction,
    determine triage severity, and persist everything to PostgreSQL.

    Returns the full SymptomLog with extracted symptoms.
    """
    # 1. Call Ollama
    try:
        llm_result = await ollama_service.extract_symptoms_with_ollama(body.raw_text)
    except Exception as exc:
        logger.error("Ollama extraction failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM service error: {exc}",
        )

    # 2. Triage
    triage = run_triage(llm_result.severity)

    # 3. Persist log
    log = symptom_service.create_symptom_log(
        db,
        payload=body,
        severity=triage.severity,
        recommendation=triage.recommendation,
    )

    # 4. Persist extracted symptoms
    if llm_result.symptoms:
        symptom_service.add_extracted_symptoms(db, log.id, llm_result.symptoms)
        db.refresh(log)  # reload relationship

    return log


# ── GET /api/logs ──────────────────────────────────────────────────────────

@router.get(
    "/logs",
    response_model=SymptomLogListOut,
    summary="List symptom logs (paginated)",
)
def list_logs(
    user_id: str | None = Query(None, description="Filter logs by user id"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Max items per page"),
    db: Session = Depends(get_db),
):
    """Return a paginated list of all symptom logs, optionally filtered by user_id."""
    total, items = symptom_service.list_symptom_logs(
        db, user_id=user_id, skip=skip, limit=limit
    )
    return SymptomLogListOut(total=total, items=items)


# ── GET /api/logs/{log_id} ─────────────────────────────────────────────────

@router.get(
    "/logs/{log_id}",
    response_model=SymptomLogOut,
    summary="Get a single symptom log",
)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    """Return a single symptom log with its extracted symptoms."""
    log = symptom_service.get_symptom_log(db, log_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symptom log {log_id} not found.",
        )
    return log
