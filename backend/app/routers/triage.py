"""
Triage router — on-demand re-triage + triage card feed.

POST /api/triage         Re-run triage for an already-logged entry
GET  /api/triage/cards   Categorised triage cards from recent logs
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import TriageCard, TriageCardsOut, TriageRequest, TriageResult
from app.services import remedy_service, symptom_service
from app.services.triage_engine import run_triage

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /api/triage ───────────────────────────────────────────────────────

@router.post(
    "/triage",
    response_model=TriageResult,
    summary="Re-triage an existing symptom log",
)
def triage_log(
    body: TriageRequest,
    db: Session = Depends(get_db),
):
    """
    Fetch an existing SymptomLog by id and re-run the triage engine on its
    stored severity label, then persist the updated recommendation.
    """
    log = symptom_service.get_symptom_log(db, body.log_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symptom log {body.log_id} not found.",
        )

    if not log.severity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Log {body.log_id} has no severity set. "
                "Submit it via POST /api/log-symptom first."
            ),
        )

    triage = run_triage(log.severity)

    updated_log = symptom_service.update_symptom_log_triage(
        db, body.log_id, triage.severity, triage.recommendation
    )
    if updated_log is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist triage update.",
        )

    return TriageResult(
        log_id=updated_log.id,
        severity=triage.severity,
        recommendation=triage.recommendation,
        remedies=triage.remedies,
        see_doctor=triage.see_doctor,
    )


# ── GET /api/triage/cards ──────────────────────────────────────────────────

_BADGE_MAP = {
    "mild": "routine",
    "moderate": "watch",
    "severe": "talk-to-doctor",
}


@router.get(
    "/triage/cards",
    response_model=TriageCardsOut,
    summary="Triage card feed from recent symptom logs",
)
def triage_cards(
    user_id: str = Query("local"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Build a list of triage cards from the user's recent symptom logs.
    Each card carries a badge (routine/watch/talk-to-doctor), a plain-language
    rationale, and any personal remedies the user has logged for that symptom.
    """
    _, logs = symptom_service.list_symptom_logs(
        db, user_id=user_id, skip=0, limit=limit
    )

    cards: List[TriageCard] = []
    for log in logs:
        severity = log.severity or "moderate"
        triage = run_triage(severity)
        badge = _BADGE_MAP.get(severity, "watch")

        # Collect symptom names from this log
        symptom_names = [s.symptom_name for s in log.extracted_symptoms if s.symptom_name]
        summary = ", ".join(symptom_names[:3]) if symptom_names else log.raw_text[:80]

        # Enrich with personal remedies for the first symptom
        personal_remedies: List[str] = []
        if symptom_names:
            remedy_entries = remedy_service.get_remedies_for_symptom(
                db, user_id=user_id, symptom_name=symptom_names[0]
            )
            personal_remedies = [
                f"{r.remedy_text}" + (f" (★ {r.rating}/5)" if r.rating else "")
                for r in remedy_entries
                if r.helped is not False
            ]

        cards.append(
            TriageCard(
                log_id=log.id,
                symptom_summary=summary,
                badge=badge,
                rationale=triage.recommendation,
                see_doctor=triage.see_doctor,
                personal_remedies=personal_remedies,
                created_at=log.created_at,
            )
        )

    return TriageCardsOut(cards=cards)
