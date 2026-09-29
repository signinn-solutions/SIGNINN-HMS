from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app
from backend.models import Property, Room, Tenant


def test_booking_persists_and_staff_can_be_managed():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    with session_factory() as db:
        db.add(Tenant(id="tenant-test", name="Test Hotel", slug="test-hotel", subdomain="test", owner_name="Owner", owner_email="owner@example.com", owner_phone="1234567890", status="Active", plan="Starter"))
        db.add(Property(id="prop-test", tenant_id="tenant-test", name="Test Property", code="TST", city="Kochi", state="Kerala"))
        db.add_all([
            Room(id="room-1", tenant_id="tenant-test", property_id="prop-test", room_number="101", room_type_id="standard", room_type_name="Standard"),
            Room(id="room-2", tenant_id="tenant-test", property_id="prop-test", room_number="102", room_type_id="standard", room_type_name="Standard"),
        ])
        db.commit()

    def override_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        headers = {"X-Tenant-ID": "tenant-test", "X-Property-ID": "prop-test"}
        booking = client.post("/api/reservations", headers=headers, json={
            "property_id": "prop-test",
            "guest": {"first_name": "Test", "last_name": "Guest", "email": "test@example.com", "phone": "1234567890"},
            "room_type_id": "standard", "room_type_name": "Standard",
            "check_in_date": "2026-10-01", "check_out_date": "2026-10-02",
            "nights": 1, "adults": 2, "total_amount": 2500, "paid_amount": 0,
        })
        assert booking.status_code == 201, booking.text
        reservation_id = booking.json()["id"]
        assert booking.json()["room_id"] == "room-1"
        second = client.post("/api/reservations", headers=headers, json={
            "property_id": "prop-test",
            "guest": {"first_name": "Next", "last_name": "Guest", "email": "next@example.com", "phone": "1234567891"},
            "room_type_id": "standard", "room_type_name": "Standard",
            "check_in_date": "2026-10-01", "check_out_date": "2026-10-02",
            "nights": 1, "adults": 1, "total_amount": 2500,
        })
        assert second.status_code == 201, second.text
        assert second.json()["room_id"] == "room-2"
        third = client.post("/api/reservations", headers=headers, json={
            "property_id": "prop-test",
            "guest": {"first_name": "Full", "last_name": "House", "email": "full@example.com", "phone": "1234567892"},
            "room_type_id": "standard", "room_type_name": "Standard",
            "check_in_date": "2026-10-01", "check_out_date": "2026-10-02",
            "nights": 1, "adults": 1, "total_amount": 2500,
        })
        assert third.status_code == 409
        listed = client.get("/api/reservations?property_id=prop-test", headers=headers)
        assert listed.status_code == 200
        assert any(item["id"] == reservation_id for item in listed.json())

        created = client.post("/api/staff-audit/staff", headers=headers, json={
            "name": "Test Employee", "email": "employee@example.com", "phone": "1234567890",
            "role": "Front Desk Agent", "propertyId": "prop-test",
        })
        assert created.status_code == 201, created.text
        staff_id = created.json()["id"]
        edited = client.patch(f"/api/staff-audit/staff/{staff_id}", headers=headers, json={"role": "Night Auditor"})
        assert edited.status_code == 200
        assert edited.json()["role"] == "Night Auditor"
        disabled = client.patch(f"/api/staff-audit/staff/{staff_id}/status", headers=headers, json={"status": "Inactive"})
        assert disabled.status_code == 200
        assert client.get("/api/staff-audit/staff", headers=headers).json()[0]["status"] == "Inactive"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
