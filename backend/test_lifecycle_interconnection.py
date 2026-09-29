import pytest
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import (
    Room,
    Reservation,
    HousekeepingTask,
    MaintenanceTicket,
    Payment,
    Invoice,
    MessageThread,
    StaffMember,
)

client = TestClient(app)

AUTH_HEADER = {
    "X-Tenant-ID": "tenant-1",
    "X-Property-ID": "prop-1",
}


def test_walk_in_occupies_room_and_records_payment():
    """Test that Walk-In check-in immediately sets room to Occupied and records advance payment in Payment table."""
    db = SessionLocal()
    # Find a clean vacant room
    vacant_room = (
        db.query(Room)
        .filter(Room.tenant_id == "tenant-1", Room.occupancy_status == "Vacant")
        .first()
    )
    assert vacant_room is not None, "Need at least one vacant room for testing"
    test_room_id = vacant_room.id
    test_room_number = vacant_room.room_number
    db.close()

    payload = {
        "property_id": "prop-1",
        "room_id": test_room_id,
        "room_number": test_room_number,
        "room_type_id": "rt-standard",
        "room_type_name": "Deluxe Room",
        "check_in_date": "2026-09-19",
        "check_out_date": "2026-09-21",
        "nights": 2,
        "adults": 2,
        "children": 0,
        "status": "Checked In",  # Walk-In immediate check-in
        "booking_source": "Direct Walk-in",
        "total_amount": 9000.0,
        "paid_amount": 9000.0,
        "rate_plan_code": "WALKIN-EP",
        "guest": {
            "first_name": "TestWalkin",
            "last_name": "Customer",
            "phone": "+91 99999 11111",
            "email": "walkin.customer@test.com",
            "id_type": "Aadhaar",
            "id_number": "1234-5678-9012",
        },
    }

    res = client.post("/api/reservations", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 201, f"Failed creating walk-in: {res.text}"
    data = res.json()
    assert data["status"] == "Checked In"
    res_id = data["id"]

    # Verify room is now Occupied in database
    db = SessionLocal()
    updated_room = db.query(Room).filter(Room.id == test_room_id).first()
    assert updated_room.occupancy_status == "Occupied"
    assert updated_room.current_reservation_id == res_id
    assert "TestWalkin" in updated_room.current_guest_name

    # Verify payment is recorded in Payment ledger table
    payment = (
        db.query(Payment)
        .filter(Payment.reservation_id == res_id)
        .first()
    )
    assert payment is not None
    assert payment.amount == 9000.0
    assert payment.status == "Success"
    db.close()


def test_reassign_room_lifecycle():
    """Test reassigning an occupied room moves guest and frees original room as Dirty."""
    db = SessionLocal()
    # Find a checked-in reservation
    res_obj = (
        db.query(Reservation)
        .filter(
            Reservation.tenant_id == "tenant-1",
            Reservation.status == "Checked In",
            Reservation.room_id.isnot(None),
        )
        .first()
    )
    assert res_obj is not None, "Need a checked-in reservation for room reassign test"
    old_room_id = res_obj.room_id

    # Find another vacant room
    new_room = (
        db.query(Room)
        .filter(
            Room.tenant_id == "tenant-1",
            Room.id != old_room_id,
            Room.occupancy_status == "Vacant",
        )
        .first()
    )
    assert new_room is not None, "Need a vacant room to reassign to"
    new_room_id = new_room.id
    db.close()

    res = client.post(
        f"/api/reservations/{res_obj.id}/reassign-room",
        json={"newRoomId": new_room_id},
        headers=AUTH_HEADER,
    )
    assert res.status_code == 200, f"Reassign failed: {res.text}"

    # Verify database state
    db = SessionLocal()
    old_r = db.query(Room).filter(Room.id == old_room_id).first()
    new_r = db.query(Room).filter(Room.id == new_room_id).first()
    assert old_r.occupancy_status == "Vacant"
    assert old_r.housekeeping_status == "Dirty"
    assert new_r.occupancy_status == "Occupied"
    assert new_r.current_reservation_id == res_obj.id
    db.close()


def test_checkout_creates_turnover_task_and_invoice():
    """Test that check-out releases room as Dirty, creates a turnover housekeeping task, and generates an invoice."""
    db = SessionLocal()
    res_obj = (
        db.query(Reservation)
        .filter(
            Reservation.tenant_id == "tenant-1",
            Reservation.status == "Checked In",
            Reservation.room_id.isnot(None),
        )
        .first()
    )
    assert res_obj is not None, "Need a checked in reservation"
    target_res_id = res_obj.id
    target_room_id = res_obj.room_id
    db.close()

    res = client.post(
        f"/api/reservations/{target_res_id}/check-out",
        json={"settlement_amount": 0.0, "payment_method": "UPI"},
        headers=AUTH_HEADER,
    )
    assert res.status_code == 200, f"Checkout failed: {res.text}"

    # Verify room is Vacant and Dirty
    db = SessionLocal()
    room = db.query(Room).filter(Room.id == target_room_id).first()
    assert room.occupancy_status == "Vacant"
    assert room.housekeeping_status == "Dirty"
    assert room.current_reservation_id is None

    # Verify a Turnover Clean task was created for this room
    task = (
        db.query(HousekeepingTask)
        .filter(
            HousekeepingTask.room_id == target_room_id,
            HousekeepingTask.task_type == "Turnover Clean",
        )
        .order_by(HousekeepingTask.id.desc())
        .first()
    )
    assert task is not None, "Turnover housekeeping task was not created on checkout"
    assert task.status == "Dirty"
    assert task.priority == "High"

    # Verify an Invoice was generated
    invoice = (
        db.query(Invoice)
        .filter(Invoice.reservation_id == target_res_id)
        .first()
    )
    assert invoice is not None, "Invoice was not generated on checkout"
    assert invoice.status == "Paid"
    assert "INV-2026" in invoice.invoice_number
    db.close()


def test_housekeeping_completion_syncs_room_status():
    """Test that completing a housekeeping task syncs the physical room status to Ready."""
    db = SessionLocal()
    # Find a dirty housekeeping task
    task = (
        db.query(HousekeepingTask)
        .filter(HousekeepingTask.tenant_id == "tenant-1")
        .first()
    )
    assert task is not None
    task_id = task.id
    room_id = task.room_id
    db.close()

    res = client.patch(
        f"/api/housekeeping/tasks/{task_id}/status",
        json={"status": "Ready"},
        headers=AUTH_HEADER,
    )
    assert res.status_code == 200

    db = SessionLocal()
    room = db.query(Room).filter(Room.id == room_id).first()
    if room:
        assert room.housekeeping_status == "Ready"
    db.close()


def test_multiple_room_status_updates_do_not_collide_audit_log_id():
    """Test updating room status multiple times without crashing on primary key unique constraints."""
    db = SessionLocal()
    room = db.query(Room).filter(Room.tenant_id == "tenant-1").first()
    assert room is not None
    room_id = room.id
    db.close()

    # Update housekeeping twice
    r1 = client.patch(f"/api/rooms/{room_id}/housekeeping", json={"status": "Clean"}, headers=AUTH_HEADER)
    assert r1.status_code == 200
    r2 = client.patch(f"/api/rooms/{room_id}/housekeeping", json={"status": "Ready"}, headers=AUTH_HEADER)
    assert r2.status_code == 200

    # Update maintenance twice
    m1 = client.patch(f"/api/rooms/{room_id}/maintenance", json={"status": "Operational"}, headers=AUTH_HEADER)
    assert m1.status_code == 200
    m2 = client.patch(f"/api/rooms/{room_id}/maintenance", json={"status": "Operational"}, headers=AUTH_HEADER)
    assert m2.status_code == 200


def test_staff_members_persisted_and_retrieved():
    """Test that staff members are present in DB and can be managed via API."""
    res = client.get("/api/staff-audit/staff", headers=AUTH_HEADER)
    assert res.status_code == 200
    staff_list = res.json()
    assert len(staff_list) >= 5, f"Expected at least 5 staff members, got {len(staff_list)}"

    # Add a new staff member
    new_staff_payload = {
        "name": "Integration Test Attendant",
        "email": f"test.attendant.{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+91 99000 88888",
        "role": "Housekeeping",
        "propertyId": "prop-1",
    }
    create_res = client.post("/api/staff-audit/staff", json=new_staff_payload, headers=AUTH_HEADER)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "Integration Test Attendant"

    # Update status
    patch_res = client.patch(
        f"/api/staff-audit/staff/{created['id']}/status",
        json={"status": "Inactive"},
        headers=AUTH_HEADER,
    )
    assert patch_res.status_code == 200


def test_messages_threads_and_dispatch():
    """Test guest messaging endpoints with database persistence."""
    res = client.get("/api/messages/threads", headers=AUTH_HEADER)
    assert res.status_code == 200
    threads = res.json()
    assert len(threads) >= 1, "Expected at least 1 message thread in DB"

    thread_id = threads[0]["id"]
    msg_res = client.post(
        f"/api/messages/threads/{thread_id}/messages",
        json={"content": "Your room service order is on its way!", "sender": "hotel"},
        headers=AUTH_HEADER,
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["content"] == "Your room service order is on its way!"
    assert msg_data["sender"] == "hotel"


def test_direct_payment_and_invoice_creation():
    """Test recording direct payments and on-demand invoices in the financial ledger."""
    pay_res = client.post(
        "/api/billing/payments",
        json={
            "amount": 2500.0,
            "method": "Card",
            "reference": "TEST-CARD-8819",
            "notes": "Direct Spa Service payment",
        },
        headers=AUTH_HEADER,
    )
    assert pay_res.status_code == 201
    pay_data = pay_res.json()
    assert pay_data["amount"] == 2500.0
    assert pay_data["status"] == "Success"

    inv_res = client.post(
        "/api/billing/invoices",
        json={
            "guestName": "Corporate Guest",
            "roomNumber": "402",
            "amount": 15000.0,
            "status": "Paid",
        },
        headers=AUTH_HEADER,
    )
    assert inv_res.status_code == 201
    inv_data = inv_res.json()
    assert "INV-2026" in inv_data["invoice_number"]
    assert inv_data["amount"] == 15000.0
