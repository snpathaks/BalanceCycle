"""
Remedy journal service — CRUD for RemedyJournal.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.db_models import RemedyJournal
from app.models.schemas import RemedyJournalCreate

logger = logging.getLogger(__name__)


def create_remedy(db: Session, payload: RemedyJournalCreate) -> RemedyJournal:
    """Insert a new remedy journal entry."""
    entry = RemedyJournal(
        user_id=payload.user_id,
        symptom_name=payload.symptom_name.lower().strip(),
        remedy_text=payload.remedy_text,
        helped=payload.helped,
        rating=payload.rating,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    logger.info("Created RemedyJournal id=%d for symptom=%r", entry.id, entry.symptom_name)
    return entry


def list_remedies(
    db: Session,
    user_id: str,
    symptom_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[RemedyJournal]:
    """List remedy journal entries, optionally filtered by symptom."""
    query = db.query(RemedyJournal).filter(RemedyJournal.user_id == user_id)
    if symptom_name:
        query = query.filter(
            RemedyJournal.symptom_name == symptom_name.lower().strip()
        )
    return (
        query.order_by(RemedyJournal.tried_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_remedies_for_symptom(
    db: Session, user_id: str, symptom_name: str
) -> List[RemedyJournal]:
    """Return remedy entries for a specific symptom (used to enrich Triage cards)."""
    return (
        db.query(RemedyJournal)
        .filter(
            RemedyJournal.user_id == user_id,
            RemedyJournal.symptom_name == symptom_name.lower().strip(),
        )
        .order_by(RemedyJournal.rating.desc().nulls_last())
        .limit(5)
        .all()
    )


def delete_remedy(db: Session, remedy_id: int, user_id: str) -> bool:
    """Delete a remedy journal entry. Returns True if deleted, False if not found."""
    entry = db.get(RemedyJournal, remedy_id)
    if entry is None or entry.user_id != user_id:
        return False
    db.delete(entry)
    db.commit()
    return True
