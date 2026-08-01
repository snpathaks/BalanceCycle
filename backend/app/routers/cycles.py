"""
Cycles router — period date logging and cycle prediction.

POST  /api/cycles            Log a period start
PATCH /api/cycles/{id}       Mark period end
GET   /api/cycles            List cycle logs
GET   /api/cycles/predict    Predict next period and fertile window
GET   /api/cycles/wheel      Cycle Wheel spoke data
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    CycleLogCreate,
    CycleLogOut,
    CycleLogUpdate,
    CyclePredictionOut,
    CycleWheelOut,
)
from app.services import cycle_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/cycles",
    response_model=CycleLogOut,
    status_code=status.HTTP_201_CREATED,
    summary="Log a period start date",
)
def log_cycle(body: CycleLogCreate, db: Session = Depends(get_db)):
    """Record a new period start. period_end may be set later via PATCH."""
    return cycle_service.create_cycle_log(db, body)


@router.patch(
    "/cycles/{cycle_id}",
    response_model=CycleLogOut,
    summary="Mark period end and compute cycle length",
)
def update_cycle(
    cycle_id: int, body: CycleLogUpdate, db: Session = Depends(get_db)
):
    """Set period_end on an existing cycle log and auto-compute cycle_length_days."""
    log = cycle_service.update_cycle_log(db, cycle_id, body)
    if log is None:
        raise HTTPException(status_code=404, detail=f"Cycle log {cycle_id} not found.")
    return log


@router.get(
    "/cycles",
    response_model=list[CycleLogOut],
    summary="List cycle logs",
)
def list_cycles(
    user_id: str = Query("local", description="User identifier"),
    limit: int = Query(12, ge=1, le=36),
    db: Session = Depends(get_db),
):
    """Return the most recent cycle logs for a user."""
    return cycle_service.list_cycle_logs(db, user_id=user_id, limit=limit)


@router.get(
    "/cycles/predict",
    response_model=CyclePredictionOut,
    summary="Predict next period start and fertile window",
)
def predict_cycle(
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """
    Uses historical cycle lengths to estimate the next period start date,
    fertile window, and days until next period.
    """
    return cycle_service.predict_next_cycle(db, user_id=user_id)


@router.get(
    "/cycles/wheel",
    response_model=CycleWheelOut,
    summary="Cycle Wheel spoke data for the current cycle",
)
def cycle_wheel(
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """
    Returns one spoke per cycle day with aggregated severity score and symptoms.
    Used to render the SVG Cycle Wheel on the Trends page.
    """
    return cycle_service.get_cycle_wheel_data(db, user_id=user_id)
