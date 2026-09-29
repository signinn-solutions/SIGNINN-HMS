import sys
import json
import base64
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import Reservation, Room, Guest, Folio, ChannelConfig, OtaIngestionLog
from backend.services.aiosell_service import AiosellClient

client = TestClient(app)


def test_aiosell_client_headers():
    aiosell = AiosellClient(username="aiosell", password="AIOsell@123")
    headers = aiosell._get_headers()
    assert "Authorization" in headers
    expected_auth = "Basic " + base64.b64encode(b"aiosell:AIOsell@123").decode("utf-8")
    assert headers["Authorization"] == expected_auth
    assert headers["Content-Type"] == "application/json"
    print("PASS: test_aiosell_client_headers")


def test_aiosell_webhook_auth_failure():
    # Unauthorized when header is missing
    res = client.post("/api/channels/aiosell/webhook", json={"action": "book", "bookingId": "TEST-1"})
    assert res.status_code == 401

    # Unauthorized when credentials are wrong
    bad_auth = "Basic " + base64.b64encode(b"wrong:creds").decode("utf-8")
    res = client.post(
        "/api/channels/aiosell/webhook",
        json={"action": "book", "bookingId": "TEST-1"},
        headers={"Authorization": bad_auth},
    )
    assert res.status_code == 401
    print("PASS: test_aiosell_webhook_auth_failure")


def test_aiosell_webhook_book_modify_cancel():
    auth_header = "Basic " + base64.b64encode(b"aiosell:AIOsell@123").decode("utf-8")
    test_booking_id = "AIO-TEST-998822"

    # 1. TEST BOOKING (Pay-at-Hotel = false -> Prepaid OTA)
    book_payload = {
        "action": "book",
        "hotelCode": "sandbox-pms",
        "channel": "Goibibo",
        "bookingId": test_booking_id,
        "cmBookingId": "CM-REF-001",
        "bookedOn": "2026-10-10 14:00:00",
        "checkin": "2026-10-15",
        "checkout": "2026-10-18",
        "segment": "OTA",
        "specialRequests": "Quiet room, upper floor, airport taxi required",
        "pah": False,
        "amount": {
            "amountAfterTax": 18500,
            "amountBeforeTax": 16000,
            "tax": 2500,
            "currency": "INR",
            "commission": 2775,
            "tcs": 185,
            "tds": 37,
        },
        "guest": {
            "firstName": "Rajesh",
            "lastName": "Khanna",
            "email": "rajesh.khanna@bollywood.in",
            "phone": "+91 98200 12345",
            "address": {
                "line1": "Bungalow 7, Carter Road",
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India",
                "zipCode": "400050",
            },
        },
        "rooms": [
            {
                "roomCode": "deluxe",
                "rateplanCode": "executive-s-ep",
                "guestName": "Rajesh Khanna",
                "occupancy": {
                    "adults": 2,
                    "children": 1,
                },
                "prices": [
                    {"date": "2026-10-15", "sellRate": 6166.67},
                    {"date": "2026-10-16", "sellRate": 6166.67},
                    {"date": "2026-10-17", "sellRate": 6166.67},
                ],
            }
        ],
    }

    res_book = client.post(
        "/api/channels/aiosell/webhook",
        json=book_payload,
        headers={"Authorization": auth_header},
    )
    assert res_book.status_code == 200, res_book.text
    book_data = res_book.json()
    assert book_data.get("success") is True
    assert "Reservation Updated Successfully" in book_data.get("message")

    # Verify database state
    db = SessionLocal()
    created_res = db.query(Reservation).filter(Reservation.ota_reservation_id == test_booking_id).first()
    assert created_res is not None
    assert created_res.check_in_date == "2026-10-15"
    assert created_res.check_out_date == "2026-10-18"
    assert created_res.nights == 3
    assert created_res.total_amount == 18500
    assert created_res.payment_status == "Paid"
    assert "Aiosell CM" in created_res.tags
    assert "Quiet room" in created_res.special_requests

    # Verify folio
    folio = db.query(Folio).filter(Folio.reservation_id == created_res.id).first()
    assert folio is not None
    assert folio.total_charges == 18500

    # 2. TEST MODIFICATION (Full state replacement)
    modify_payload = {
        **book_payload,
        "action": "modify",
        "checkin": "2026-10-16",
        "checkout": "2026-10-20",  # 4 nights now
        "pah": True,  # Changed to pay at hotel
        "amount": {
            "amountAfterTax": 24000,
            "amountBeforeTax": 21000,
            "tax": 3000,
            "currency": "INR",
            "commission": 3600,
            "tcs": 240,
            "tds": 48,
        },
        "specialRequests": "Updated: extra bed requested",
    }

    res_mod = client.post(
        "/update_reservation",  # Test the root route alias as well
        json=modify_payload,
        headers={"Authorization": auth_header},
    )
    assert res_mod.status_code == 200, res_mod.text
    mod_data = res_mod.json()
    assert mod_data.get("success") is True

    db.refresh(created_res)
    assert created_res.check_in_date == "2026-10-16"
    assert created_res.check_out_date == "2026-10-20"
    assert created_res.nights == 4
    assert created_res.total_amount == 24000
    assert created_res.payment_status == "Unpaid"  # Because pah is now True
    assert "extra bed" in created_res.special_requests

    # 3. TEST CANCELLATION
    cancel_payload = {
        "action": "cancel",
        "hotelCode": "sandbox-pms",
        "channel": "Goibibo",
        "bookingId": test_booking_id,
    }

    res_cancel = client.post(
        "/api/channels/aiosell/webhook",
        json=cancel_payload,
        headers={"Authorization": auth_header},
    )
    assert res_cancel.status_code == 200
    db.refresh(created_res)
    assert created_res.status == "Cancelled"

    # Clean up test reservation
    db.query(Reservation).filter(Reservation.ota_reservation_id == test_booking_id).delete()
    db.commit()
    db.close()
    print("PASS: test_aiosell_webhook_book_modify_cancel")


def test_aiosell_webhook_optional_guest_fields():
    """Rule 11: guest details are optional/withheld by OTAs - system must never fail."""
    auth_header = "Basic " + base64.b64encode(b"aiosell:AIOsell@123").decode("utf-8")
    test_booking_id = "AIO-MASKED-12345"

    payload_no_guest = {
        "action": "book",
        "hotelCode": "sandbox-pms",
        "channel": "Agoda",
        "bookingId": test_booking_id,
        "bookedOn": "2026-10-10 12:00:00",
        "checkin": "2026-10-20",
        "checkout": "2026-10-22",
        "segment": "OTA",
        "pah": True,
        "amount": {"amountAfterTax": 8000, "currency": "INR"},
        "guest": None,  # Agoda withholding guest details
        "rooms": [{"roomCode": "standard"}],
    }

    res = client.post(
        "/api/channels/aiosell/webhook",
        json=payload_no_guest,
        headers={"Authorization": auth_header},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data.get("success") is True

    # Clean up
    db = SessionLocal()
    db.query(Reservation).filter(Reservation.ota_reservation_id == test_booking_id).delete()
    db.commit()
    db.close()
    print("PASS: test_aiosell_webhook_optional_guest_fields")


def test_all_26_spreadsheet_channels_exist():
    db = SessionLocal()
    channels = db.query(ChannelConfig).all()
    assert len(channels) == 26, f"Expected 26 channels, got {len(channels)}"

    categories = {c.category for c in channels}
    assert "OTA" in categories
    assert "CM" in categories
    assert "Booking Engine" in categories
    assert "OTA Aggregator" in categories

    slugs = {c.aiosell_slug for c in channels if c.aiosell_slug}
    expected_slugs = ["booking.com", "gommt", "agoda", "airbnb", "expedia", "ezee", "simplotel", "bakuun"]
    for s in expected_slugs:
        assert s in slugs, f"Expected slug {s} to be present"

    db.close()
    print("PASS: test_all_26_spreadsheet_channels_exist")


def test_aiosell_config_endpoint_masks_credentials():
    res = client.get("/api/channels/aiosell/config")
    assert res.status_code == 200
    data = res.json()
    assert "password" not in data, "Security failure: password leaked in config endpoint"
    assert "hotelCode" in data
    assert "partnerId" in data
    assert "configured" in data
    assert data["configured"] is True
    print("PASS: test_aiosell_config_endpoint_masks_credentials")


def test_aiosell_room_mapping_endpoint():
    res = client.get("/api/channels/aiosell/room-mapping", headers={"X-Tenant-ID": "tenant-1"})
    assert res.status_code == 401
    print("PASS: test_aiosell_room_mapping_endpoint_requires_login")


def test_aiosell_webhook_multi_property_resolution():
    auth_header = "Basic " + base64.b64encode(b"aiosell:AIOsell@123").decode("utf-8")
    
    # 1. Test valid hotelCode matching property code "GA-GOA"
    res = client.post(
        "/api/channels/aiosell/webhook",
        json={
            "action": "book",
            "hotelCode": "GA-GOA",
            "bookingId": "MULTI-PROP-001",
            "channel": "Booking.com",
            "checkin": "2026-11-01",
            "checkout": "2026-11-03",
            "rooms": [{"roomCode": "executive"}],
        },
        headers={"Authorization": auth_header},
    )
    assert res.status_code == 200
    assert res.json().get("success") is True

    # 2. Test unknown hotelCode
    res_bad = client.post(
        "/api/channels/aiosell/webhook",
        json={
            "action": "book",
            "hotelCode": "NON-EXISTENT-HOTEL",
            "bookingId": "MULTI-PROP-002",
            "channel": "Booking.com",
        },
        headers={"Authorization": auth_header},
    )
    assert res_bad.status_code == 200
    assert res_bad.json().get("success") is False
    assert "Unknown Aiosell hotel code" in res_bad.json().get("message")

    # Clean up test booking
    db = SessionLocal()
    db.query(Reservation).filter(Reservation.ota_reservation_id == "MULTI-PROP-001").delete()
    db.commit()
    db.close()
    print("PASS: test_aiosell_webhook_multi_property_resolution")


if __name__ == "__main__":
    test_aiosell_client_headers()
    test_aiosell_webhook_auth_failure()
    test_aiosell_webhook_book_modify_cancel()
    test_aiosell_webhook_optional_guest_fields()
    test_all_26_spreadsheet_channels_exist()
    test_aiosell_config_endpoint_masks_credentials()
    test_aiosell_room_mapping_endpoint()
    test_aiosell_webhook_multi_property_resolution()
    print("\nALL 8 INTEGRATION TESTS PASSED PERFECTLY!")

