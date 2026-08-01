"""
Symptom service — all DB read/write logic for SymptomLog and ExtractedSymptom.

This layer sits between the routers and the ORM models.
Routers call these functions; they never touch SQLAlchemy directly.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.db_models import ExtractedSymptom, SymptomLog
from app.models.schemas import ExtractedSymptomCreate, SymptomLogCreate

logger = logging.getLogger(__name__)


# ── Write operations ───────────────────────────────────────────────────────

def create_symptom_log(
    db: Session,
    payload: SymptomLogCreate,
    severity: Optional[str] = None,
    recommendation: Optional[str] = None,
) -> SymptomLog:
    """
    Insert a new SymptomLog row and return the ORM instance (with id populated).

    Args:
        db:             Active SQLAlchemy session (injected via Depends).
        payload:        Validated SymptomLogCreate from the request body.
        severity:       Optional severity label pre-filled from the LLM.
        recommendation: Optional recommendation text.

    Returns:
        The newly created SymptomLog ORM object.
    """
    log = SymptomLog(
        user_id=payload.user_id,
        raw_text=payload.raw_text,
        severity=severity,
        recommendation=recommendation,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info("Created SymptomLog id=%d severity=%r", log.id, log.severity)
    return log


def add_extracted_symptoms(
    db: Session,
    log_id: int,
    symptoms: List[ExtractedSymptomCreate],
) -> List[ExtractedSymptom]:
    """
    Bulk-insert ExtractedSymptom rows linked to ``log_id``.

    Args:
        db:       Active SQLAlchemy session.
        log_id:   Parent SymptomLog primary key.
        symptoms: List of validated ExtractedSymptomCreate objects.

    Returns:
        List of persisted ExtractedSymptom ORM objects.
    """
    objs = [
        ExtractedSymptom(
            log_id=log_id,
            symptom_name=s.symptom_name,
            body_area=s.body_area,
            intensity=s.intensity,
            duration_days=s.duration_days,
            notes=s.notes,
            category=s.category,
            severity_score=s.severity_score,
        )
        for s in symptoms
    ]
    db.add_all(objs)
    db.commit()
    for obj in objs:
        db.refresh(obj)
    logger.info("Saved %d extracted symptom(s) for log_id=%d", len(objs), log_id)
    return objs


def update_symptom_log_triage(
    db: Session,
    log_id: int,
    severity: str,
    recommendation: str,
) -> Optional[SymptomLog]:
    """
    Update the triage fields on an existing SymptomLog.
    Returns None if the log does not exist.
    """
    log = db.get(SymptomLog, log_id)
    if log is None:
        logger.warning("update_symptom_log_triage: log_id=%d not found", log_id)
        return None
    log.severity = severity
    log.recommendation = recommendation
    db.commit()
    db.refresh(log)
    return log


# ── Read operations ────────────────────────────────────────────────────────

def get_symptom_log(db: Session, log_id: int) -> Optional[SymptomLog]:
    """Fetch a single SymptomLog by primary key (None if not found)."""
    return db.get(SymptomLog, log_id)


def list_symptom_logs(
    db: Session,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[int, List[SymptomLog]]:
    """
    Return (total_count, page_of_logs) optionally filtered by user_id.

    Args:
        db:      Active SQLAlchemy session.
        user_id: If provided, filter logs to this user.
        skip:    Number of rows to skip (pagination offset).
        limit:   Maximum number of rows to return.

    Returns:
        A tuple of (total_count, list_of_SymptomLog).
    """
    query = db.query(SymptomLog)
    if user_id:
        query = query.filter(SymptomLog.user_id == user_id)

    total = query.count()
    logs = (
        query.order_by(SymptomLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return total, logs
