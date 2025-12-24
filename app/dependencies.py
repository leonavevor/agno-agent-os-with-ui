"""
Dependencies for FastAPI endpoints
"""

from typing import Generator
from sqlalchemy.orm import Session
from db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
