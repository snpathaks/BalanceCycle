"""
Trends router — weekly severity bars, correlation insights, summary.

GET /api/trends/bars          Weekly severity bar data
GET /api/trends/summary       This vs last cycle + correlations + variability
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import CorrelationInsight, SeverityBar, TrendsOut
from app.services import trends_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/trends/bars",
    response_model=List[SeverityBar],
    summary="Weekly severity bar chart data",
)
def get_bars(
    user_id: str = Query("local"),
    category: Optional[str] = Query(None, description="Filter by category: mood|skin|pain|energy|digestive|sleep"),
    weeks: int = Query(8, ge=1, le=26),
    db: Session = Depends(get_db),
):
    """
    Return average severity_score per ISO week, optionally filtered by category.
    Used for the Recharts bar chart on the Trends page.
    """
    return trends_service.get_weekly_bars(
        db, user_id=user_id, category=category, weeks=weeks
    )


@router.get(
    "/trends/summary",
    response_model=TrendsOut,
    summary="Trends summary: cycle comparison + correlations + variability",
)
def get_summary(
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """
    Returns:
    - This cycle vs last cycle average severity comparison
    - Plain-language correlation insights (pattern detection)
    - Cycle length variability data
    """
    return trends_service.get_trends_summary(db, user_id=user_id)
