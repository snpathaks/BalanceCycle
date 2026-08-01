"""
Remedies router — personal remedy journal CRUD.

POST   /api/remedies            Log a tried remedy
GET    /api/remedies            List remedy journal
DELETE /api/remedies/{id}       Remove a remedy entry
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import RemedyJournalCreate, RemedyJournalOut
from app.services import remedy_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/remedies",
    response_model=RemedyJournalOut,
    status_code=status.HTTP_201_CREATED,
    summary="Log a tried remedy for a symptom",
)
def log_remedy(body: RemedyJournalCreate, db: Session = Depends(get_db)):
    """Record a holistic remedy the user tried, with optional helped flag and rating."""
    return remedy_service.create_remedy(db, body)


@router.get(
    "/remedies",
    response_model=List[RemedyJournalOut],
    summary="List personal remedy journal",
)
def list_remedies(
    user_id: str = Query("local"),
    symptom: Optional[str] = Query(None, description="Filter by symptom name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Return the user's remedy journal, optionally filtered by symptom."""
    return remedy_service.list_remedies(
        db, user_id=user_id, symptom_name=symptom, skip=skip, limit=limit
    )


@router.delete(
    "/remedies/{remedy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a remedy journal entry",
)
def delete_remedy(
    remedy_id: int,
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """Remove a remedy journal entry by id."""
    deleted = remedy_service.delete_remedy(db, remedy_id=remedy_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Remedy {remedy_id} not found.")
