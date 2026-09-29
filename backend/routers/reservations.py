import random
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_tenant_id
from backend.models import (
    Reservation,
    Room,
    Guest,
    Folio,
    FolioItem,
    Payment,
    AuditLog,
    Property,
    HousekeepingTask,
    Invoice,
    generate_id,
)
from backend.schemas import (
    ReservationCreate,
    ReservationResponse,
    CheckInRequest,
    CheckOutRequest,
)

router = APIRouter(prefix="/api/reservations", tags=["Reservations & Front Desk"])


@router.get("", response_model=List[ReservationResponse])
def get_reservations(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    query = db.query(Reservation).filter(Reservation.tenant_id == tenant_id)
    if property_id:
        query = query.filter(Reservation.property_id == property_id)
    if status:
        query = query.filter(Reservation.status == status)
    if date:
        query = query.filter(
            (Reservation.check_in_date == date) | (Reservation.check_out_date == date)
        )
    return query.order_by(Reservation.created_at.desc()).all()


@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.tenant_id == tenant_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return res


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    res_in: ReservationCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    # 1. Resolve property
    prop_id = res_in.property_id
    if not prop_id:
        prop = db.query(Property).filter(Property.tenant_id == tenant_id).first()
        prop_id = prop.id if prop else "prop-1"

    try:
        arrival = date.fromisoformat(res_in.check_in_date)
        departure = date.fromisoformat(res_in.check_out_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Stay dates must use YYYY-MM-DD")
    if departure <= arrival:
        raise HTTPException(status_code=422, detail="Check-out must be after check-in")
    if res_in.nights != (departure - arrival).days:
        raise HTTPException(status_code=422, detail="Night count does not match stay dates")
    if not db.query(Property).filter(Property.id == prop_id, Property.tenant_id == tenant_id).first():
        raise HTTPException(status_code=404, detail="Property not found")

    # Assign a room with no overlapping live reservation in this property and category.
    occupied_room_ids = db.query(Reservation.room_id).filter(
        Reservation.tenant_id == tenant_id,
        Reservation.property_id == prop_id,
        Reservation.status.notin_(["Cancelled", "Checked Out"]),
        Reservation.check_in_date < res_in.check_out_date,
        Reservation.check_out_date > res_in.check_in_date,
        Reservation.room_id.isnot(None),
    )
    candidates = db.query(Room).filter(
        Room.tenant_id == tenant_id,
        Room.property_id == prop_id,
        Room.maintenance_status == "Operational",
        ~Room.id.in_(occupied_room_ids),
    )
    if res_in.room_id:
        candidates = candidates.filter(Room.id == res_in.room_id)
    else:
        candidates = candidates.filter(Room.room_type_id == res_in.room_type_id)
    room = candidates.order_by(Room.room_number).with_for_update().first()
    if not room:
        raise HTTPException(status_code=409, detail="No free room of this type for the selected dates")

    # 2. Resolve or create Guest
    guest_id = res_in.guest_id
    guest = None
    if not guest_id and res_in.guest:
        # Check existing guest by email/phone
        if res_in.guest.phone:
            guest = db.query(Guest).filter(
                Guest.tenant_id == tenant_id,
                Guest.phone == res_in.guest.phone,
            ).first()
        if not guest:
            guest_id = generate_id("gst")
            guest = Guest(
                id=guest_id,
                tenant_id=tenant_id,
                first_name=res_in.guest.first_name,
                last_name=res_in.guest.last_name,
                email=res_in.guest.email,
                phone=res_in.guest.phone,
                id_type=res_in.guest.id_type,
                id_number=res_in.guest.id_number,
                nationality=res_in.guest.nationality,
                vip_status=res_in.guest.vip_status,
                city=res_in.guest.city or "",
            )
            db.add(guest)
            db.commit()
    elif guest_id:
        guest = db.query(Guest).filter(Guest.id == guest_id, Guest.tenant_id == tenant_id).first()

    guest_name = f"{guest.first_name} {guest.last_name}" if guest else "Guest"

    # 3. Create reservation
    res_id = generate_id("res")
    ref_code = f"SGN-26-{random.randint(1000, 9999)}"
    new_res = Reservation(
        id=res_id,
        tenant_id=tenant_id,
        property_id=prop_id,
        ref_code=ref_code,
        guest_id=guest.id if guest else "gst-temp",
        room_id=room.id,
        room_number=room.room_number,
        room_type_id=room.room_type_id or res_in.room_type_id,
        room_type_name=room.room_type_name or res_in.room_type_name or "Standard Room",
        check_in_date=res_in.check_in_date,
        check_out_date=res_in.check_out_date,
        nights=res_in.nights,
        adults=res_in.adults,
        children=res_in.children,
        status=res_in.status if res_in.status in ["Confirmed", "Checked In"] else "Confirmed",
        booking_source=res_in.booking_source,
        nightly_rate=res_in.nightly_rate or (res_in.total_amount / max(1, res_in.nights)),
        total_amount=res_in.total_amount,
        paid_amount=res_in.paid_amount,
        balance_amount=max(0.0, res_in.total_amount - res_in.paid_amount),
        payment_status="Paid" if res_in.paid_amount >= res_in.total_amount else "Partially Paid" if res_in.paid_amount > 0 else "Unpaid",
        rate_plan_code=res_in.rate_plan_code,
        special_requests=res_in.special_requests or "",
        eta=res_in.eta or "14:00",
    )
    db.add(new_res)

    # If reservation was created directly in 'Checked In' state (e.g. Walk-In), immediately occupy room
    if new_res.status == "Checked In":
        room.occupancy_status = "Occupied"
        room.current_reservation_id = new_res.id
        room.current_guest_name = guest_name
        room.key_card_assigned = True
    elif arrival == date.today() and room.occupancy_status == "Vacant":
        room.occupancy_status = "Reserved"
        room.current_reservation_id = new_res.id
        room.current_guest_name = guest_name
    elif arrival > date.today():
        room.next_arrival_date = min(room.next_arrival_date or res_in.check_in_date, res_in.check_in_date)

    db.commit()

    # 4. Automatically generate Folio for the booking
    folio_id = generate_id("fol")
    folio = Folio(
        id=folio_id,
        tenant_id=tenant_id,
        reservation_id=res_id,
        reservation_ref=ref_code,
        guest_name=guest_name,
        room_number=room.room_number,
        total_charges=res_in.total_amount,
        total_payments=res_in.paid_amount,
        total_taxes=res_in.total_amount * 0.12,
        balance=max(0.0, res_in.total_amount - res_in.paid_amount),
        status="Open",
    )
    db.add(folio)
    db.commit()

    # Room charge line item
    item = FolioItem(
        id=generate_id("fi"),
        tenant_id=tenant_id,
        folio_id=folio_id,
        description=f"Room Tariff ({res_in.nights} night(s))",
        category="Room",
        amount=res_in.total_amount,
        type="Charge",
    )
    db.add(item)

    if res_in.paid_amount > 0:
        p_item = FolioItem(
            id=generate_id("fi"),
            tenant_id=tenant_id,
            folio_id=folio_id,
            description="Booking Advance Deposit",
            category="Misc",
            amount=res_in.paid_amount,
            type="Payment",
            payment_method="UPI",
            reference=f"DEP-{ref_code}",
        )
        db.add(p_item)

        # Also insert record into global Payment table for financial ledger consistency
        db.add(Payment(
            id=generate_id("pay"),
            tenant_id=tenant_id,
            reservation_id=res_id,
            reservation_ref=ref_code,
            guest_name=guest_name,
            amount=res_in.paid_amount,
            currency="INR",
            method="UPI",
            status="Success",
            reference=f"DEP-{ref_code}",
            notes="Booking Advance Deposit",
        ))

    db.commit()
    db.refresh(new_res)
    return new_res


@router.post("/{reservation_id}/check-in")
def check_in_guest(
    reservation_id: str,
    req: CheckInRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.tenant_id == tenant_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    room_id = req.room_id or res.room_id
    if not room_id:
        raise HTTPException(status_code=400, detail="Room assignment is required for check-in")

    room = db.query(Room).filter(Room.id == room_id, Room.tenant_id == tenant_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Update Room state
    room.occupancy_status = "Occupied"
    room.current_reservation_id = res.id
    room.current_guest_name = f"{res.guest.first_name} {res.guest.last_name}" if res.guest else "In-house Guest"
    room.key_card_assigned = True

    # Update Reservation state
    res.status = "Checked In"
    res.room_id = room.id
    res.room_number = room.room_number

    # Process advance payment if any
    if req.advance_paid > 0:
        res.paid_amount += req.advance_paid
        res.balance_amount = max(0.0, res.total_amount - res.paid_amount)
        res.payment_status = "Paid" if res.balance_amount == 0 else "Partially Paid"

        # Record payment & folio item
        folio = db.query(Folio).filter(Folio.reservation_id == res.id).first()
        if folio:
            folio.total_payments += req.advance_paid
            folio.balance = max(0.0, folio.total_charges - folio.total_payments)
            db.add(FolioItem(
                id=generate_id("fi"),
                tenant_id=tenant_id,
                folio_id=folio.id,
                description=f"Check-In Advance Payment ({req.payment_method})",
                category="Misc",
                amount=req.advance_paid,
                type="Payment",
                payment_method=req.payment_method,
                reference=f"CKIN-{res.ref_code}",
            ))

        db.add(Payment(
            id=generate_id("pay"),
            tenant_id=tenant_id,
            reservation_id=res.id,
            reservation_ref=res.ref_code,
            guest_name=room.current_guest_name,
            amount=req.advance_paid,
            currency="INR",
            method=req.payment_method,
            status="Success",
            reference=f"CKIN-{res.ref_code}",
            notes="Collected at Front Desk upon check-in",
        ))

    # Audit log
    db.add(AuditLog(
        id=generate_id("log"),
        tenant_id=tenant_id,
        staff_name="Front Desk Operator",
        action="Check-In",
        entity_id=res.id,
        details=f"Guest checked in to Room {room.room_number} (Ref: {res.ref_code}). Advance paid: INR {req.advance_paid}",
    ))

    db.commit()
    return {"message": f"Successfully checked in to Room {room.room_number}", "reservation": res.id}


@router.post("/{reservation_id}/check-out")
def check_out_guest(
    reservation_id: str,
    req: CheckOutRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.tenant_id == tenant_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # Release room and queue Housekeeping turnover task
    if res.room_id:
        room = db.query(Room).filter(Room.id == res.room_id, Room.tenant_id == tenant_id).first()
        if room:
            room.occupancy_status = "Vacant"
            room.housekeeping_status = "Dirty"  # trigger turnover clean
            room.current_reservation_id = None
            room.current_guest_name = None
            room.key_card_assigned = False

            # Create an operational Housekeeping turnover clean task
            hsk_task = HousekeepingTask(
                id=generate_id("tsk"),
                tenant_id=tenant_id,
                room_id=room.id,
                room_number=room.room_number,
                room_type=room.room_type_name or "Standard Room",
                task_type="Turnover Clean",
                priority="High",
                status="Dirty",
                assigned_to="Housekeeping Team",
                estimated_minutes=35,
                checklist=[
                    {"id": "c1", "label": "Strip bed linens & sanitize mattress", "done": False},
                    {"id": "c2", "label": "Sanitize bathroom fixtures & restock towels", "done": False},
                    {"id": "c3", "label": "Vacuum & mop floors", "done": False},
                    {"id": "c4", "label": "Replenish toiletries & minibar items", "done": False},
                    {"id": "c5", "label": "Inspect AC, lights & electronic door lock", "done": False},
                ],
            )
            db.add(hsk_task)

    # Process settlement if needed
    if req.settlement_amount > 0:
        res.paid_amount += req.settlement_amount
        res.balance_amount = max(0.0, res.total_amount - res.paid_amount)
        res.payment_status = "Paid"

        folio = db.query(Folio).filter(Folio.reservation_id == res.id).first()
        if folio:
            folio.total_payments += req.settlement_amount
            folio.balance = 0.0
            folio.status = "Settled"
            db.add(FolioItem(
                id=generate_id("fi"),
                tenant_id=tenant_id,
                folio_id=folio.id,
                description=f"Check-Out Final Settlement ({req.payment_method})",
                category="Misc",
                amount=req.settlement_amount,
                type="Payment",
                payment_method=req.payment_method,
                reference=f"CKOUT-{res.ref_code}",
            ))

        db.add(Payment(
            id=generate_id("pay"),
            tenant_id=tenant_id,
            reservation_id=res.id,
            reservation_ref=res.ref_code,
            guest_name=f"{res.guest.first_name} {res.guest.last_name}" if res.guest else "Guest",
            amount=req.settlement_amount,
            currency="INR",
            method=req.payment_method,
            status="Success",
            reference=f"CKOUT-{res.ref_code}",
            notes="Final Folio settlement at departure",
        ))

    res.status = "Checked Out"

    # Automatically generate official Tax Invoice upon checkout settlement
    inv_num = f"INV-2026-{random.randint(10000, 99999)}"
    tax = round(res.total_amount * 0.12, 2)
    invoice = Invoice(
        id=generate_id("inv"),
        tenant_id=tenant_id,
        invoice_number=inv_num,
        reservation_id=res.id,
        reservation_ref=res.ref_code,
        guest_name=f"{res.guest.first_name} {res.guest.last_name}" if res.guest else "Guest",
        guest_email=res.guest.email if res.guest else "",
        guest_phone=res.guest.phone if res.guest else "",
        room_number=res.room_number or "",
        stay_dates=f"{res.check_in_date} to {res.check_out_date}",
        subtotal=res.total_amount - tax,
        tax_total=tax,
        cgst=round(tax / 2, 2),
        sgst=round(tax / 2, 2),
        grand_total=res.total_amount,
        amount=res.total_amount,
        paid_amount=res.paid_amount,
        balance_due=0.0,
        status="Paid",
        date=datetime.utcnow().strftime("%Y-%m-%d"),
        due_date=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    db.add(invoice)

    db.add(AuditLog(
        id=generate_id("log"),
        tenant_id=tenant_id,
        staff_name="Front Desk Operator",
        action="Check-Out",
        entity_id=res.id,
        details=f"Reservation {res.ref_code} checked out. Room released for housekeeping turnover. Invoice {inv_num} generated.",
    ))

    db.commit()
    return {"message": "Check-out completed and room queued for housekeeping.", "reservation": res.id}


@router.post("/{reservation_id}/reassign-room")
def reassign_room(
    reservation_id: str,
    payload: dict,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.tenant_id == tenant_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    new_room_id = payload.get("roomId") or payload.get("newRoomId")
    if not new_room_id:
        raise HTTPException(status_code=400, detail="New room ID is required")

    new_room = db.query(Room).filter(Room.id == new_room_id, Room.tenant_id == tenant_id).first()
    if not new_room:
        raise HTTPException(status_code=404, detail="New room not found")

    # If guest is already checked in, release previous room
    if res.status == "Checked In" and res.room_id and res.room_id != new_room_id:
        old_room = db.query(Room).filter(Room.id == res.room_id, Room.tenant_id == tenant_id).first()
        if old_room:
            old_room.occupancy_status = "Vacant"
            old_room.housekeeping_status = "Dirty"
            old_room.current_reservation_id = None
            old_room.current_guest_name = None

        new_room.occupancy_status = "Occupied"
        new_room.current_reservation_id = res.id
        new_room.current_guest_name = f"{res.guest.first_name} {res.guest.last_name}" if res.guest else "In-house Guest"

    res.room_id = new_room.id
    res.room_number = new_room.room_number

    # Update folio room number
    folio = db.query(Folio).filter(Folio.reservation_id == res.id).first()
    if folio:
        folio.room_number = new_room.room_number

    db.commit()
    return {"message": f"Assigned to Room {new_room.room_number}", "roomNumber": new_room.room_number}


@router.patch("/{reservation_id}/cancel")
def cancel_reservation(
    reservation_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    res = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.tenant_id == tenant_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if res.room_id:
        room = db.query(Room).filter(Room.id == res.room_id).first()
        if room and room.occupancy_status == "Reserved":
            room.occupancy_status = "Vacant"

    res.status = "Cancelled"
    db.commit()
    return {"message": "Reservation cancelled successfully"}
