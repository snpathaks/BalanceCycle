"""
SQLAlchemy ORM table definitions for BalanceCycle.

Tables:
  - symptom_logs         : one row per user submission (raw free-text)
  - extracted_symptoms   : structured symptoms extracted from a log by the LLM
  - cycle_logs           : period start/end dates for cycle tracking & prediction
  - remedy_journal       : personal "what works for me" remedy records
"""

from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow():
    """Timezone-aware UTC timestamp helper."""
    return datetime.now(timezone.utc)


# ── SymptomLog ─────────────────────────────────────────────────────────────
class SymptomLog(Base):
    """
    Stores the raw user input and top-level triage result.
    One row is inserted every time the frontend calls POST /api/log-symptom.
    """

    __tablename__ = "symptom_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(128), nullable=True, index=True)
    raw_text = Column(Text, nullable=False)
    severity = Column(String(32), nullable=True)   # "mild" | "moderate" | "severe"
    recommendation = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # One symptom-log can have many extracted symptoms
    extracted_symptoms = relationship(
        "ExtractedSymptom", back_populates="log", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SymptomLog id={self.id} severity={self.severity!r}>"


# ── ExtractedSymptom ───────────────────────────────────────────────────────
class ExtractedSymptom(Base):
    """
    Structured symptom entities extracted by the Ollama LLM from a SymptomLog.
    One SymptomLog → many ExtractedSymptom rows.
    """

    __tablename__ = "extracted_symptoms"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    log_id = Column(
        BigInteger, ForeignKey("symptom_logs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # LLM-extracted fields
    symptom_name = Column(String(256), nullable=False)
    body_area = Column(String(128), nullable=True)       # e.g. "lower abdomen"
    intensity = Column(Integer, nullable=True)           # 1-10 scale
    duration_days = Column(Numeric(6, 2), nullable=True) # 0.5 = half a day
    notes = Column(Text, nullable=True)

    # Extended fields for BalanceCycle features
    category = Column(String(64), nullable=True)         # mood|skin|pain|energy|digestive|sleep
    severity_score = Column(SmallInteger, nullable=True) # 1-5, used for Cycle Wheel spoke length

    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Back-reference to the parent log
    log = relationship("SymptomLog", back_populates="extracted_symptoms")

    def __repr__(self):
        return (
            f"<ExtractedSymptom id={self.id} "
            f"name={self.symptom_name!r} log_id={self.log_id}>"
        )


# ── CycleLog ───────────────────────────────────────────────────────────────
class CycleLog(Base):
    """
    Tracks menstrual period start and end dates per user.
    Used for cycle prediction, Cycle Wheel phase calculation, and variability charting.
    """

    __tablename__ = "cycle_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    period_start = Column(DateTime(timezone=True), nullable=False, index=True)
    period_end = Column(DateTime(timezone=True), nullable=True)   # null = ongoing
    cycle_length_days = Column(SmallInteger, nullable=True)        # filled on period_end
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    def __repr__(self):
        return f"<CycleLog id={self.id} user={self.user_id!r} start={self.period_start.date()}>"


# ── RemedyJournal ──────────────────────────────────────────────────────────
class RemedyJournal(Base):
    """
    Personal "what works for me" record.
    Users can mark holistic remedies they've tried for a symptom and rate effectiveness.
    Surfaced back on future Triage cards for the same symptom.
    """

    __tablename__ = "remedy_journal"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    symptom_name = Column(String(256), nullable=False, index=True)  # normalised symptom
    remedy_text = Column(Text, nullable=False)                       # e.g. "ginger tea"
    helped = Column(Boolean, nullable=True)                          # True/False/null=unsure
    rating = Column(SmallInteger, nullable=True)                     # 1-5 stars
    tried_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    def __repr__(self):
        return (
            f"<RemedyJournal id={self.id} symptom={self.symptom_name!r} "
            f"remedy={self.remedy_text[:30]!r}>"
        )
