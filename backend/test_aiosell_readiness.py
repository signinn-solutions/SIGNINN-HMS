from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from fastapi import HTTPException
import pytest

from backend.database import Base
from backend.main import app
from backend.models import Property, Tenant
from backend.routers import channels


def test_aiosell_config_does_not_expose_credentials():
    config = channels.get_aiosell_config()
    assert "username" not in config
    assert "password" not in config
    assert "sandboxUiPass" not in config


def test_webhook_simulator_requires_login():
    client = TestClient(app)
    assert client.post("/api/channels/aiosell/simulate-webhook", json={"action": "cancel"}).status_code == 401
    assert client.post("/api/channels/aiosell/push-rates", json={"updates": []}).status_code == 401


def test_mapping_check_does_not_mutate_channels(monkeypatch):
    class Client:
        hotel_code = "sandbox-pms"
        partner_id = "sample-pms"

        def get_property_details(self, **kwargs):
            return {"success": True, "data": {"hotel_id": "sandbox-pms", "rooms": [{"room_id": "executive"}]}}

    class NoWriteDatabase:
        def query(self, *_args):
            raise AssertionError("Mapping check must not change channel records")

        def commit(self):
            raise AssertionError("Mapping check must not commit")

    monkeypatch.setattr(channels, "configured_aiosell_client", lambda **kwargs: Client())
    response = channels.force_channels_sync(tenant_id="tenant-test", db=NoWriteDatabase())
    assert response["success"] is True


def test_outbound_calls_cannot_override_configured_hotel(monkeypatch):
    monkeypatch.setattr(channels, "DEFAULT_AIOSELL_USERNAME", "user")
    monkeypatch.setattr(channels, "DEFAULT_AIOSELL_PASSWORD", "password")
    monkeypatch.setattr(channels, "DEFAULT_AIOSELL_PARTNER_ID", "partner")
    monkeypatch.setattr(channels, "DEFAULT_AIOSELL_HOTEL_CODE", "hotel-one")
    with pytest.raises(HTTPException) as error:
        channels.configured_aiosell_client(hotel_code="hotel-two")
    assert error.value.status_code == 403


def test_webhook_requires_explicit_property_for_external_hotel_code(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Tenant(
            id="tenant-test", name="Test Hotel", slug="test-hotel", subdomain="test.local",
            owner_name="Owner", owner_email="owner@test.local", owner_phone="123",
        ))
        db.add(Property(
            id="property-test", tenant_id="tenant-test", name="Test Hotel", code="PMS-TEST",
            city="Test City", state="Test State",
        ))
        db.commit()

        monkeypatch.setattr(channels, "DEFAULT_AIOSELL_HOTEL_CODE", "sandbox-pms")
        monkeypatch.setattr(channels, "AIOSELL_PROPERTY_ID", "")
        payload = {"action": "cancel", "hotelCode": "sandbox-pms", "bookingId": "missing"}
        assert channels.process_aiosell_webhook(payload, db)["success"] is False

        monkeypatch.setattr(channels, "AIOSELL_PROPERTY_ID", "property-test")
        assert channels.process_aiosell_webhook(payload, db)["success"] is True

        wrong_hotel = {**payload, "hotelCode": "PMS-TEST"}
        assert channels.process_aiosell_webhook(wrong_hotel, db)["success"] is True
        assert channels.process_aiosell_webhook(payload, db, "other-property")["success"] is False
