"""
Pydantic request/response schemas for BalanceCycle.

Kept separate from SQLAlchemy ORM models (db_models.py) to enforce
a clean boundary between the API contract and the persistence layer.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Shared / base schemas ──────────────────────────────────────────────────

class ExtractedSymptomBase(BaseModel):
    symptom_name: str = Field(..., max_length=256, examples=["cramps"])
    body_area: Optional[str] = Field(None, max_length=128, examples=["lower abdomen"])
    intensity: Optional[int] = Field(None, ge=1, le=10, examples=[7])
    duration_days: Optional[float] = Field(None, ge=0, examples=[2.5])
    notes: Optional[str] = Field(None, examples=["worse in the morning"])
    category: Optional[str] = Field(None, max_length=64, examples=["pain"])
    severity_score: Optional[int] = Field(None, ge=1, le=5, examples=[3])


class ExtractedSymptomCreate(ExtractedSymptomBase):
    """Used internally by the service layer when persisting LLM output."""
    pass


class ExtractedSymptomOut(ExtractedSymptomBase):
    """Returned to the client inside a SymptomLogOut object."""
    id: int
    log_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Symptom-log schemas ────────────────────────────────────────────────────

class SymptomLogCreate(BaseModel):
    """Body for POST /api/log-symptom."""
    raw_text: str = Field(
        ...,
        min_length=5,
        max_length=4000,
        examples=["I have severe cramps and nausea for 3 days"],
    )
    user_id: Optional[str] = Field(None, max_length=128, examples=["user_abc123"])

    @field_validator("raw_text")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class SymptomLogOut(BaseModel):
    """Returned by POST /api/log-symptom and GET /api/logs/{id}."""
    id: int
    user_id: Optional[str]
    raw_text: str
    severity: Optional[str]
    recommendation: Optional[str]
    created_at: datetime
    extracted_symptoms: List[ExtractedSymptomOut] = []

    model_config = {"from_attributes": True}


class SymptomLogListOut(BaseModel):
    """Returned by GET /api/logs — paginated list."""
    total: int
    items: List[SymptomLogOut]


# ── Triage schemas ─────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    """Body for POST /api/triage — re-triage an already-logged entry."""
    log_id: int = Field(..., ge=1, examples=[42])


class TriageResult(BaseModel):
    """Structured triage output."""
    log_id: int
    severity: str = Field(..., examples=["moderate"])
    recommendation: str = Field(
        ..., examples=["Apply heat, take ibuprofen 400 mg; see a doctor if no improvement in 48 h"]
    )
    remedies: List[str] = []
    see_doctor: bool = False

    model_config = {"from_attributes": True}


class TriageCard(BaseModel):
    """A single triage card shown in the Triage page."""
    log_id: int
    symptom_summary: str
    badge: str  # "routine" | "watch" | "talk-to-doctor"
    rationale: str
    see_doctor: bool
    personal_remedies: List[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TriageCardsOut(BaseModel):
    """Response for GET /api/triage/cards."""
    cards: List[TriageCard]


# ── Cycle log schemas ──────────────────────────────────────────────────────

class CycleLogCreate(BaseModel):
    """Body for POST /api/cycles."""
    user_id: str = Field(..., max_length=128, examples=["local"])
    period_start: datetime
    period_end: Optional[datetime] = None
    notes: Optional[str] = None


class CycleLogUpdate(BaseModel):
    """Body for PATCH /api/cycles/{id} — mark period end."""
    period_end: datetime
    notes: Optional[str] = None


class CycleLogOut(BaseModel):
    id: int
    user_id: str
    period_start: datetime
    period_end: Optional[datetime]
    cycle_length_days: Optional[int]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class CyclePredictionOut(BaseModel):
    """Returned by GET /api/cycles/predict."""
    average_cycle_length: Optional[int]  # days
    next_period_start: Optional[date]
    fertile_window_start: Optional[date]
    fertile_window_end: Optional[date]
    days_until_next_period: Optional[int]
    confidence: str  # "low" | "medium" | "high"


# ── Trends schemas ─────────────────────────────────────────────────────────

class WheelSpoke(BaseModel):
    """One spoke of the Cycle Wheel — one day in the current cycle."""
    day_number: int             # 1-indexed day within cycle
    date: Optional[date]
    phase: str                  # "menstrual" | "follicular" | "ovulation" | "luteal"
    severity_score: float       # 0-5 average across logged symptoms that day
    symptoms: List[str]         # symptom names logged that day
    log_ids: List[int]


class CycleWheelOut(BaseModel):
    """Response for GET /api/trends/wheel."""
    cycle_length: int
    current_day: int
    spokes: List[WheelSpoke]


class SeverityBar(BaseModel):
    """One bar in the weekly severity chart."""
    week_label: str             # e.g. "Jul 14"
    category: str
    avg_severity: float
    count: int


class CorrelationInsight(BaseModel):
    """A plain-language pattern insight."""
    symptom: str
    insight: str                # e.g. "Headaches appear 2 days before your period in 4 of your last 5 cycles"
    confidence: str             # "possible" | "likely" | "strong"


class VariabilityPoint(BaseModel):
    """One cycle length data point."""
    cycle_number: int
    start_date: date
    length_days: int
    flagged: bool               # True if notably irregular


class TrendsOut(BaseModel):
    """Response for GET /api/trends/summary."""
    this_cycle_avg_severity: Optional[float]
    last_cycle_avg_severity: Optional[float]
    correlations: List[CorrelationInsight]
    variability: List[VariabilityPoint]


# ── Remedy journal schemas ─────────────────────────────────────────────────

class RemedyJournalCreate(BaseModel):
    user_id: str = Field(..., max_length=128, examples=["local"])
    symptom_name: str = Field(..., max_length=256)
    remedy_text: str
    helped: Optional[bool] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class RemedyJournalOut(BaseModel):
    id: int
    user_id: str
    symptom_name: str
    remedy_text: str
    helped: Optional[bool]
    rating: Optional[int]
    notes: Optional[str]
    tried_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Export schema ──────────────────────────────────────────────────────────

class ExportDataOut(BaseModel):
    """Structured data for browser-side PDF generation."""
    generated_at: datetime
    user_id: str
    logs: List[SymptomLogOut]
    cycles: List[CycleLogOut]
    prediction: Optional[CyclePredictionOut]
    triage_cards: List[TriageCard]
    remedy_journal: List[RemedyJournalOut] = []


# ── Ollama-internal schema (not exposed in API) ────────────────────────────

class OllamaExtractedPayload(BaseModel):
    """
    Shape of the JSON the Ollama service is expected to return.
    Used for internal validation only; not part of the public API.
    """
    symptoms: List[ExtractedSymptomCreate] = []
    severity: str = Field(..., examples=["mild"])
    summary: Optional[str] = None
