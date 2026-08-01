"""
SQLAlchemy engine + session factory for HerBalancedCycle.

Usage inside a FastAPI route:
    from app.core.database import get_db
    ...
    def my_route(db: Session = Depends(get_db)):
        ...
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────
# pool_pre_ping=True silently reconnects stale connections from the pool,
# important for long-running servers.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.debug,   # prints SQL in development; silent in production
)

# ── Session factory ────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Declarative base ───────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All ORM models inherit from this base."""
    pass


# ── FastAPI dependency ─────────────────────────────────────────────────────
def get_db():
    """
    Yield a DB session per request, then close it when the request finishes.
    Always used via FastAPI's Depends() mechanism.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
