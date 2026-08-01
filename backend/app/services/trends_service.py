"""
Trends service — weekly bar data, correlation insights, and summaries.

All logic is pure Python / SQLAlchemy — no Ollama calls.
Correlation detection uses a simple rule engine over logged data.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.db_models import CycleLog, ExtractedSymptom, SymptomLog
from app.models.schemas import CorrelationInsight, SeverityBar, TrendsOut

logger = logging.getLogger(__name__)


# ── Weekly bar data ────────────────────────────────────────────────────────

def get_weekly_bars(
    db: Session,
    user_id: str,
    category: Optional[str] = None,
    weeks: int = 8,
) -> List[SeverityBar]:
    """
    Return average severity_score grouped by ISO week and category
    over the last ``weeks`` weeks.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)

    query = (
        db.query(ExtractedSymptom, SymptomLog.created_at)
        .join(SymptomLog, ExtractedSymptom.log_id == SymptomLog.id)
        .filter(
            SymptomLog.user_id == user_id,
            SymptomLog.created_at >= cutoff,
            ExtractedSymptom.severity_score.isnot(None),
        )
    )
    if category:
        query = query.filter(ExtractedSymptom.category == category)

    rows = query.all()

    # Group by (week_label, category)
    buckets: dict[Tuple[str, str], List[int]] = defaultdict(list)
    for sym, created_at in rows:
        # ISO week label like "Jul 14"
        week_start = created_at - timedelta(days=created_at.weekday())
        week_label = week_start.strftime("%b ") + str(week_start.day)  # cross-platform, no leading zero
        key = (week_label, sym.category or "other")
        buckets[key].append(sym.severity_score)

    bars: List[SeverityBar] = [
        SeverityBar(
            week_label=week_label,
            category=cat,
            avg_severity=round(mean(scores), 2),
            count=len(scores),
        )
        for (week_label, cat), scores in sorted(buckets.items())
    ]
    return bars


# ── Correlation insights ───────────────────────────────────────────────────

def get_correlation_insights(
    db: Session, user_id: str
) -> List[CorrelationInsight]:
    """
    Detect plain-language symptom patterns from logged data.
    Checks if a symptom appears within N days before each period start,
    across the last 5 cycles.
    """
    cycles = (
        db.query(CycleLog)
        .filter(CycleLog.user_id == user_id)
        .order_by(CycleLog.period_start.desc())
        .limit(5)
        .all()
    )

    if len(cycles) < 2:
        return []

    # For each cycle, collect symptom names logged in the 5 days before period start
    PRE_PERIOD_DAYS = 5
    cycle_pre_symptoms: List[List[str]] = []

    for cycle in cycles:
        window_end = cycle.period_start
        window_start = window_end - timedelta(days=PRE_PERIOD_DAYS)

        logs = (
            db.query(ExtractedSymptom)
            .join(SymptomLog, ExtractedSymptom.log_id == SymptomLog.id)
            .filter(
                SymptomLog.user_id == user_id,
                SymptomLog.created_at >= window_start,
                SymptomLog.created_at < window_end,
            )
            .all()
        )
        cycle_pre_symptoms.append(
            [s.symptom_name.lower().strip() for s in logs if s.symptom_name]
        )

    # Count per symptom: how many cycles it appeared in pre-period
    symptom_cycle_count: dict[str, int] = defaultdict(int)
    for cycle_syms in cycle_pre_symptoms:
        for sym in set(cycle_syms):  # deduplicate within a cycle
            symptom_cycle_count[sym] += 1

    total_cycles = len(cycles)
    insights: List[CorrelationInsight] = []

    for symptom, count in sorted(symptom_cycle_count.items(), key=lambda x: -x[1]):
        if count < 2:
            continue  # need at least 2 cycles to flag

        fraction = count / total_cycles
        if fraction >= 0.8:
            confidence = "strong"
        elif fraction >= 0.6:
            confidence = "likely"
        else:
            confidence = "possible"

        insight_text = (
            f"{symptom.capitalize()} appears in the {PRE_PERIOD_DAYS} days "
            f"before your period in {count} of your last {total_cycles} cycles."
        )
        insights.append(
            CorrelationInsight(
                symptom=symptom,
                insight=insight_text,
                confidence=confidence,
            )
        )

    return insights[:5]  # cap at 5 insights to keep the UI readable


# ── Cycle comparison summary ───────────────────────────────────────────────

def get_trends_summary(db: Session, user_id: str) -> TrendsOut:
    """
    Build the full trends summary: this-cycle vs last-cycle severity comparison,
    correlation insights, and variability data.
    """
    from app.services.cycle_service import get_variability

    cycles = (
        db.query(CycleLog)
        .filter(CycleLog.user_id == user_id)
        .order_by(CycleLog.period_start.desc())
        .limit(2)
        .all()
    )

    def _avg_severity_for_cycle(cycle: CycleLog) -> Optional[float]:
        end = cycle.period_end or datetime.now(timezone.utc)
        scores = (
            db.query(ExtractedSymptom.severity_score)
            .join(SymptomLog, ExtractedSymptom.log_id == SymptomLog.id)
            .filter(
                SymptomLog.user_id == user_id,
                SymptomLog.created_at >= cycle.period_start,
                SymptomLog.created_at <= end,
                ExtractedSymptom.severity_score.isnot(None),
            )
            .all()
        )
        vals = [r[0] for r in scores]
        return round(mean(vals), 2) if vals else None

    this_avg = _avg_severity_for_cycle(cycles[0]) if cycles else None
    last_avg = _avg_severity_for_cycle(cycles[1]) if len(cycles) > 1 else None

    return TrendsOut(
        this_cycle_avg_severity=this_avg,
        last_cycle_avg_severity=last_avg,
        correlations=get_correlation_insights(db, user_id),
        variability=get_variability(db, user_id),
    )
