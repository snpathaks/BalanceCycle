"""
Cycle service — CRUD for CycleLog + cycle prediction + Cycle Wheel data.

All logic is pure Python / SQLAlchemy — no Ollama calls.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from statistics import mean, stdev
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.db_models import CycleLog, ExtractedSymptom, SymptomLog
from app.models.schemas import (
    CycleLogCreate,
    CycleLogUpdate,
    CyclePredictionOut,
    CycleWheelOut,
    VariabilityPoint,
    WheelSpoke,
)

logger = logging.getLogger(__name__)

_PHASE_BREAKPOINTS = {
    # (start_fraction, end_fraction) of cycle length
    "menstrual": (0.0, 0.18),
    "follicular": (0.18, 0.45),
    "ovulation": (0.45, 0.55),
    "luteal": (0.55, 1.0),
}


def _phase_for_day(day_number: int, cycle_length: int) -> str:
    """Return the phase name for a given cycle day (1-indexed)."""
    fraction = (day_number - 1) / max(cycle_length, 1)
    for phase, (lo, hi) in _PHASE_BREAKPOINTS.items():
        if lo <= fraction < hi:
            return phase
    return "luteal"


# ── Write operations ───────────────────────────────────────────────────────

def create_cycle_log(db: Session, payload: CycleLogCreate) -> CycleLog:
    """Insert a new CycleLog row."""
    log = CycleLog(
        user_id=payload.user_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info("Created CycleLog id=%d user=%r", log.id, log.user_id)
    return log


def update_cycle_log(
    db: Session, cycle_id: int, payload: CycleLogUpdate
) -> Optional[CycleLog]:
    """Mark period end and compute cycle length."""
    log = db.get(CycleLog, cycle_id)
    if log is None:
        return None
    log.period_end = payload.period_end
    if payload.notes is not None:
        log.notes = payload.notes
    if log.period_start:
        delta = payload.period_end - log.period_start
        log.cycle_length_days = max(1, delta.days)
    db.commit()
    db.refresh(log)
    return log


def list_cycle_logs(
    db: Session, user_id: str, limit: int = 12
) -> List[CycleLog]:
    """Return the most recent cycle logs for a user."""
    return (
        db.query(CycleLog)
        .filter(CycleLog.user_id == user_id)
        .order_by(CycleLog.period_start.desc())
        .limit(limit)
        .all()
    )


# ── Cycle prediction ───────────────────────────────────────────────────────

def predict_next_cycle(
    db: Session, user_id: str
) -> CyclePredictionOut:
    """
    Compute average cycle length from history and estimate the next period start.
    Returns confidence based on number of data points.
    """
    cycles = (
        db.query(CycleLog)
        .filter(
            CycleLog.user_id == user_id,
            CycleLog.cycle_length_days.isnot(None),
        )
        .order_by(CycleLog.period_start.desc())
        .limit(6)
        .all()
    )

    # Find the most recent period start (including ongoing)
    latest = (
        db.query(CycleLog)
        .filter(CycleLog.user_id == user_id)
        .order_by(CycleLog.period_start.desc())
        .first()
    )

    lengths = [c.cycle_length_days for c in cycles if c.cycle_length_days]

    if not lengths or not latest:
        return CyclePredictionOut(
            average_cycle_length=None,
            next_period_start=None,
            fertile_window_start=None,
            fertile_window_end=None,
            days_until_next_period=None,
            confidence="low",
        )

    avg_length = round(mean(lengths))
    confidence = "high" if len(lengths) >= 4 else ("medium" if len(lengths) >= 2 else "low")

    last_start: datetime = latest.period_start
    next_start: date = (last_start + timedelta(days=avg_length)).date()

    # Fertile window: ~14 days before next period, ±3 days
    ovulation_day = avg_length - 14
    fertile_start = (last_start + timedelta(days=ovulation_day - 3)).date()
    fertile_end = (last_start + timedelta(days=ovulation_day + 3)).date()

    today = datetime.now(timezone.utc).date()
    days_until = (next_start - today).days

    return CyclePredictionOut(
        average_cycle_length=avg_length,
        next_period_start=next_start,
        fertile_window_start=fertile_start,
        fertile_window_end=fertile_end,
        days_until_next_period=days_until,
        confidence=confidence,
    )


# ── Cycle Wheel data ───────────────────────────────────────────────────────

def get_cycle_wheel_data(
    db: Session, user_id: str
) -> CycleWheelOut:
    """
    Build Cycle Wheel spoke data for the current cycle.
    Each spoke = one day, with aggregated severity_score and symptom names.
    """
    # Determine cycle start and length
    latest_cycle = (
        db.query(CycleLog)
        .filter(CycleLog.user_id == user_id)
        .order_by(CycleLog.period_start.desc())
        .first()
    )

    if latest_cycle:
        cycle_start: datetime = latest_cycle.period_start
        # Use stored length or predict
        cycles_with_length = (
            db.query(CycleLog)
            .filter(
                CycleLog.user_id == user_id,
                CycleLog.cycle_length_days.isnot(None),
            )
            .all()
        )
        lengths = [c.cycle_length_days for c in cycles_with_length]
        cycle_length = round(mean(lengths)) if lengths else 28
    else:
        # No cycle data yet — use today as start with default 28 days
        cycle_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        cycle_length = 28

    today = datetime.now(timezone.utc)
    current_day = max(1, (today - cycle_start).days + 1)
    current_day = min(current_day, cycle_length)

    # Collect all symptom logs in this cycle window
    cycle_end = cycle_start + timedelta(days=cycle_length)
    logs_in_cycle = (
        db.query(SymptomLog)
        .filter(
            SymptomLog.user_id == user_id,
            SymptomLog.created_at >= cycle_start,
            SymptomLog.created_at < cycle_end,
        )
        .all()
    )

    # Index logs by day number
    day_data: dict[int, dict] = {}
    for log in logs_in_cycle:
        day_num = max(1, (log.created_at - cycle_start).days + 1)
        if day_num not in day_data:
            day_data[day_num] = {"scores": [], "symptoms": [], "log_ids": []}
        day_data[day_num]["log_ids"].append(log.id)
        for sym in log.extracted_symptoms:
            if sym.severity_score:
                day_data[day_num]["scores"].append(sym.severity_score)
            if sym.symptom_name:
                day_data[day_num]["symptoms"].append(sym.symptom_name)

    # Build spokes
    spokes: List[WheelSpoke] = []
    for day_num in range(1, cycle_length + 1):
        d = day_data.get(day_num, {"scores": [], "symptoms": [], "log_ids": []})
        avg_severity = round(mean(d["scores"]), 2) if d["scores"] else 0.0
        spoke_date = (cycle_start + timedelta(days=day_num - 1)).date()
        spokes.append(
            WheelSpoke(
                day_number=day_num,
                date=spoke_date,
                phase=_phase_for_day(day_num, cycle_length),
                severity_score=avg_severity,
                symptoms=list(dict.fromkeys(d["symptoms"])),  # deduplicate, preserve order
                log_ids=d["log_ids"],
            )
        )

    return CycleWheelOut(
        cycle_length=cycle_length,
        current_day=current_day,
        spokes=spokes,
    )


# ── Variability ────────────────────────────────────────────────────────────

def get_variability(db: Session, user_id: str) -> List[VariabilityPoint]:
    """
    Return per-cycle length data with irregular cycles flagged.
    A cycle is flagged if its length deviates > 7 days from the average.
    """
    cycles = (
        db.query(CycleLog)
        .filter(
            CycleLog.user_id == user_id,
            CycleLog.cycle_length_days.isnot(None),
        )
        .order_by(CycleLog.period_start.asc())
        .all()
    )

    if not cycles:
        return []

    lengths = [c.cycle_length_days for c in cycles]
    avg = mean(lengths)
    threshold = 7  # days

    points: List[VariabilityPoint] = []
    for i, cycle in enumerate(cycles):
        flagged = abs(cycle.cycle_length_days - avg) > threshold
        points.append(
            VariabilityPoint(
                cycle_number=i + 1,
                start_date=cycle.period_start.date(),
                length_days=cycle.cycle_length_days,
                flagged=flagged,
            )
        )
    return points
