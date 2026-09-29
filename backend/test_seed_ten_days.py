from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import seed_50_rooms_yearly as seed_module
from backend.models import Reservation


def test_seed_reservations_stop_at_september_30(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(seed_module, "engine", engine)
    monkeypatch.setattr(seed_module, "SessionLocal", sessionmaker(bind=engine))
    seed_module.seed_50_rooms_yearly()
    with sessionmaker(bind=engine)() as db:
        count, first_arrival, last_arrival, last_departure = db.query(
            func.count(Reservation.id),
            func.min(Reservation.check_in_date),
            func.max(Reservation.check_in_date),
            func.max(Reservation.check_out_date),
        ).one()
    assert count > 50
    assert first_arrival >= "2026-09-21"
    assert last_arrival <= "2026-09-30"
    assert last_departure <= "2026-10-01"
    engine.dispose()
