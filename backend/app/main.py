"""
BalanceCycle – FastAPI application entrypoint.

Start with:  uvicorn app.main:app --reload
             (run from the backend/ directory)
"""

from datetime import datetime, timezone

from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.models.schemas import ExportDataOut
from app.routers import symptoms, triage, cycles, trends, remedies
from app.services import symptom_service, cycle_service, remedy_service
from app.services.triage_engine import run_triage

# ── Create DB tables on startup (dev only — use Alembic in production) ─────
if settings.debug:
    Base.metadata.create_all(bind=engine)

# ── Application factory ────────────────────────────────────────────────────
app = FastAPI(
    title="BalanceCycle API",
    description="Women's hormonal health & cycle-tracking backend (Ollama LLM + PostgreSQL)",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(symptoms.router, prefix="/api", tags=["Symptoms"])
app.include_router(triage.router,   prefix="/api", tags=["Triage"])
app.include_router(cycles.router,   prefix="/api", tags=["Cycles"])
app.include_router(trends.router,   prefix="/api", tags=["Trends"])
app.include_router(remedies.router, prefix="/api", tags=["Remedies"])


# ── Health ─────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Quick liveness probe."""
    return {"status": "ok", "service": "BalanceCycle API", "version": "3.0.0"}


# ── Export ─────────────────────────────────────────────────────────────────
@app.get("/api/export/data", response_model=ExportDataOut, tags=["Export"])
def export_data(
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """
    Return all structured data for a user in a single response.
    Used by the frontend to generate a PDF for doctor appointments.
    No data is sent to any third-party — the PDF is built entirely in the browser.
    """
    _BADGE_MAP = {"mild": "routine", "moderate": "watch", "severe": "talk-to-doctor"}

    _, logs = symptom_service.list_symptom_logs(db, user_id=user_id, skip=0, limit=200)
    cycle_logs = cycle_service.list_cycle_logs(db, user_id=user_id, limit=36)
    prediction = cycle_service.predict_next_cycle(db, user_id=user_id)
    remedies_all = remedy_service.list_remedies(db, user_id=user_id, skip=0, limit=100)

    # Build triage cards for export
    from app.models.schemas import TriageCard
    triage_cards = []
    for log in logs[:50]:  # cap at 50 for PDF
        severity = log.severity or "moderate"
        t = run_triage(severity)
        symptom_names = [s.symptom_name for s in log.extracted_symptoms if s.symptom_name]
        summary = ", ".join(symptom_names[:3]) if symptom_names else log.raw_text[:80]
        remedies_list = []
        if symptom_names:
            rem = remedy_service.get_remedies_for_symptom(db, user_id, symptom_names[0])
            remedies_list = [r.remedy_text for r in rem if r.helped is not False]
        triage_cards.append(
            TriageCard(
                log_id=log.id,
                symptom_summary=summary,
                badge=_BADGE_MAP.get(severity, "watch"),
                rationale=t.recommendation,
                see_doctor=t.see_doctor,
                personal_remedies=remedies_list,
                created_at=log.created_at,
            )
        )

    return ExportDataOut(
        generated_at=datetime.now(timezone.utc),
        user_id=user_id,
        logs=logs,
        cycles=cycle_logs,
        prediction=prediction,
        triage_cards=triage_cards,
        remedy_journal=remedies_all,
    )


# ── Delete all user data ───────────────────────────────────────────────────
@app.delete("/api/user-data", tags=["Settings"], status_code=204)
def delete_all_user_data(
    user_id: str = Query("local"),
    db: Session = Depends(get_db),
):
    """
    Hard-delete all data for a user — symptom logs, cycle logs, and remedy journal.
    This is a permanent, irreversible action.
    """
    from app.models.db_models import CycleLog, RemedyJournal, SymptomLog

    db.query(SymptomLog).filter(SymptomLog.user_id == user_id).delete()
    db.query(CycleLog).filter(CycleLog.user_id == user_id).delete()
    db.query(RemedyJournal).filter(RemedyJournal.user_id == user_id).delete()
    db.commit()
