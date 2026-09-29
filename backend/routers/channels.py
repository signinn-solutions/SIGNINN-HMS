import re
import uuid
import json
import base64
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from backend.database import get_db
from backend.dependencies import get_current_tenant_id, get_auth_context, get_current_user, AuthContext
from backend.models import (
    Tenant,
    Property,
    RoomType,
    Room,
    Guest,
    Reservation,
    Folio,
    FolioItem,
    ChannelConfig,
    OtaIngestionLog,
    AuditLog,
)
from backend.schemas import ChannelConfigResponse
from backend.services.aiosell_service import (
    AiosellClient,
    DEFAULT_AIOSELL_BASE_URL,
    DEFAULT_AIOSELL_USERNAME,
    DEFAULT_AIOSELL_PASSWORD,
    DEFAULT_AIOSELL_HOTEL_CODE,
    DEFAULT_AIOSELL_PARTNER_ID,
)
from backend.config import AIOSELL_PROPERTY_ID

router = APIRouter(prefix="/api/channels", tags=["OTA Channel Manager"])


# Default mapping of PMS room types to Aiosell Room IDs & Rate Plan IDs
PMS_TO_AIOSELL_MAPPING = {
    "DGV": {"roomCode": "executive", "rateplanCode": "executive-s-ep"},
    "DSV": {"roomCode": "executive", "rateplanCode": "executive-d-ep"},
    "EOS": {"roomCode": "suite", "rateplanCode": "suite-s-ep"},
    "PPV": {"roomCode": "suite", "rateplanCode": "suite-d-ep"},
}

AIOSELL_TO_PMS_ROOM_MAP = {
    "executive": "DGV",
    "suite": "EOS",
}


def configured_aiosell_client(hotel_code: Optional[str] = None, partner_id: Optional[str] = None) -> AiosellClient:
    if not DEFAULT_AIOSELL_USERNAME or not DEFAULT_AIOSELL_PASSWORD or not DEFAULT_AIOSELL_PARTNER_ID or not DEFAULT_AIOSELL_HOTEL_CODE:
        raise HTTPException(
            status_code=503,
            detail="Aiosell credentials, partner ID and hotel code are not configured in environment (.env).",
        )
    if hotel_code and hotel_code != DEFAULT_AIOSELL_HOTEL_CODE:
        raise HTTPException(status_code=403, detail="Hotel code differs from configured Aiosell property")
    if partner_id and partner_id != DEFAULT_AIOSELL_PARTNER_ID:
        raise HTTPException(status_code=403, detail="Partner ID differs from configured Aiosell partner")
    return AiosellClient(
        hotel_code=hotel_code or DEFAULT_AIOSELL_HOTEL_CODE,
        partner_id=partner_id or DEFAULT_AIOSELL_PARTNER_ID,
    )


def validate_aiosell_mapping(client: AiosellClient, updates: List[Dict[str, Any]], hotel_code: Optional[str]) -> None:
    result = client.get_property_details(hotel_code=hotel_code)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error") or "Could not verify Aiosell property mapping")
    mapping = result.get("data") or {}
    expected_hotel = hotel_code or client.hotel_code
    if mapping.get("hotel_id") and expected_hotel and mapping.get("hotel_id").lower() != expected_hotel.lower():
        raise HTTPException(status_code=409, detail=f"Aiosell hotel code mismatch: expected '{expected_hotel}', got '{mapping.get('hotel_id')}'")
    rooms = {room.get("room_id"): room for room in mapping.get("rooms", [])}
    for update in updates:
        for entry in update.get("rooms", []) + update.get("rates", []):
            room = rooms.get(entry.get("roomCode"))
            if not room:
                raise HTTPException(status_code=422, detail=f"Unmapped Aiosell room code: {entry.get('roomCode')}. Check Channel Manager mapping.")
            rateplan_code = entry.get("rateplanCode")
            if rateplan_code and rateplan_code not in {plan.get("rateplan_id") for plan in room.get("rateplans", [])}:
                raise HTTPException(status_code=422, detail=f"Unmapped Aiosell rate plan code: {rateplan_code}. Check Channel Manager mapping.")


class PushInventoryRequest(BaseModel):
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None
    updates: List[Dict[str, Any]]


class PushRatesRequest(BaseModel):
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None
    updates: List[Dict[str, Any]]


class PushRestrictionsRequest(BaseModel):
    type: str = "inventory"  # "inventory" or "rates"
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None
    to_channels: List[str]
    updates: List[Dict[str, Any]]


class ChannelMultiplierRequest(BaseModel):
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None
    multiplier: float
    channels: List[str]


class MarkNoShowRequest(BaseModel):
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None
    booking_id: str
    channel: str  # "booking.com" or "gommt"


class FetchDataRequest(BaseModel):
    data_type: str  # "inventory", "rates", or "reservation"
    start_date: str
    end_date: str
    hotel_code: Optional[str] = None
    partner_id: Optional[str] = None


# ==========================================
# STANDARD CHANNEL MANAGEMENT
# ==========================================

@router.get("", response_model=List[ChannelConfigResponse])
def get_channels(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return db.query(ChannelConfig).filter(ChannelConfig.tenant_id == tenant_id).all()


@router.get("/logs")
def get_channel_logs(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    """Returns the latest OTA ingestion and sync logs."""
    logs = (
        db.query(OtaIngestionLog)
        .filter(OtaIngestionLog.tenant_id == tenant_id)
        .order_by(OtaIngestionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.post("/force-sync", dependencies=[Depends(get_current_user)])
def force_channels_sync(
    hotel_code: Optional[str] = None,
    partner_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Real-time synchronization verification against Aiosell Channel Manager.
    Fails immediately if Aiosell API is unreachable or credentials invalid.
    """
    client = configured_aiosell_client(hotel_code=hotel_code, partner_id=partner_id)
    target_hotel_code = hotel_code or client.hotel_code
    target_partner_id = partner_id or client.partner_id
    result = client.get_property_details(hotel_code=target_hotel_code, partner_id=target_partner_id)
    if not result.get("success"):
        raise HTTPException(
            status_code=502,
            detail=result.get("error") or "Failed to reach Aiosell Channel Manager API. Verify partner credentials and network.",
        )
    mapping = result.get("data") or {}
    hotel_id = mapping.get("hotel_id") or target_hotel_code
    rooms = mapping.get("rooms", [])
    if not rooms:
        raise HTTPException(status_code=502, detail="Aiosell returned no rooms or invalid property mapping.")

    return {
        "success": True,
        "message": f"Aiosell property mapping verified for Hotel '{hotel_id}'. No channel status was changed.",
        "hotelCode": hotel_id,
        "roomsCount": len(rooms),
        "rooms": [
            {
                "roomId": r.get("room_id"),
                "roomName": r.get("room_name"),
                "rateplans": [rp.get("rateplan_id") for rp in r.get("rateplans", [])],
            }
            for r in rooms
        ],
        "verifiedAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
    }


@router.patch("/{channel_id}/toggle")
def toggle_channel_status(
    channel_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    ch = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.tenant_id == tenant_id,
    ).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    ch.status = "Disconnected" if ch.status == "Connected" else "Connected"
    db.commit()
    return {"message": f"Channel status changed to {ch.status}", "status": ch.status}


@router.patch("/{channel_id}/markup")
def update_channel_markup(
    channel_id: str,
    payload: Dict[str, float],
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    ch = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.tenant_id == tenant_id,
    ).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    markup = payload.get("markup") if "markup" in payload else payload.get("rateMultiplier")
    if markup is not None:
        ch.rate_multiplier = float(markup)
        db.commit()
    return {"message": "Rate multiplier updated", "rateMultiplier": ch.rate_multiplier}


# ==========================================
# AIOSELL CHANNEL MANAGER OPERATIONS
# ==========================================

@router.get("/aiosell/config")
def get_aiosell_config():
    """Returns non-secret Aiosell configuration for the UI (never exposes credentials)."""
    return {
        "baseUrl": DEFAULT_AIOSELL_BASE_URL,
        "hotelCode": DEFAULT_AIOSELL_HOTEL_CODE,
        "partnerId": DEFAULT_AIOSELL_PARTNER_ID,
        "configured": bool(DEFAULT_AIOSELL_USERNAME and DEFAULT_AIOSELL_PASSWORD and DEFAULT_AIOSELL_PARTNER_ID and DEFAULT_AIOSELL_HOTEL_CODE),
        "webhookConfigured": bool(AIOSELL_PROPERTY_ID),
        "sandboxUiUrl": "https://live.aiosell.com",
        "webhookUrl": "/api/channels/aiosell/webhook",
        "alternateWebhookUrl": "/update_reservation",
        "isSandbox": "sandbox" in (DEFAULT_AIOSELL_HOTEL_CODE or "").lower() or "sandbox" in (DEFAULT_AIOSELL_BASE_URL or "").lower(),
    }


@router.get("/aiosell/room-mapping", dependencies=[Depends(get_current_user)])
def get_room_mapping(
    tenant_id: str = Depends(get_current_tenant_id),
    auth: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    """
    Returns mapped PMS room types vs Aiosell room codes & rate plans,
    along with live available Aiosell rooms and rate plans.
    """
    prop = db.query(Property).filter(Property.id == auth.property_id, Property.tenant_id == tenant_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Select a valid PMS property for Aiosell mapping")
    prop_id = prop.id
    pms_room_types = db.query(RoomType).filter(RoomType.property_id == prop_id).all()

    live_aiosell_rooms = []
    try:
        client = configured_aiosell_client()
        details = client.get_property_details()
        if details.get("success") and details.get("data", {}).get("rooms"):
            for r in details["data"]["rooms"]:
                live_aiosell_rooms.append({
                    "roomCode": r.get("room_id"),
                    "roomName": r.get("room_name"),
                    "rateplans": [
                        {
                            "rateplanCode": rp.get("rateplan_id"),
                            "rateplanName": rp.get("rateplan_name"),
                            "occupancy": rp.get("occupancy"),
                        }
                        for rp in r.get("rateplans", [])
                    ]
                })
    except Exception:
        pass

    mappings = []
    for rt in pms_room_types:
        mapped = PMS_TO_AIOSELL_MAPPING.get(rt.code)
        verified = bool(mapped and any(
            room["roomCode"] == mapped["roomCode"] and
            any(plan["rateplanCode"] == mapped["rateplanCode"] for plan in room["rateplans"])
            for room in live_aiosell_rooms
        ))
        mappings.append({
            "pmsRoomTypeId": rt.id,
            "pmsRoomTypeCode": rt.code,
            "pmsRoomTypeName": rt.name,
            "pmsBasePrice": rt.base_price,
            "aiosellRoomCode": mapped["roomCode"] if verified else None,
            "aiosellRateplanCode": mapped["rateplanCode"] if verified else None,
            "verified": verified,
        })

    return {
        "success": True,
        "propertyId": prop_id,
        "hotelCode": DEFAULT_AIOSELL_HOTEL_CODE or "sandbox-pms",
        "mappings": mappings,
        "aiosellAvailableRooms": live_aiosell_rooms,
    }


@router.get("/aiosell/mapping", dependencies=[Depends(get_current_user)])
def get_aiosell_mapping(
    hotel_code: Optional[str] = None,
    partner_id: Optional[str] = None,
):
    """Fetches real-time property mapping details from Aiosell."""
    client = configured_aiosell_client(hotel_code, partner_id)
    res = client.get_property_details(hotel_code=hotel_code, partner_id=partner_id)
    return res


@router.post("/aiosell/push-inventory", dependencies=[Depends(get_current_user)])
def aiosell_push_inventory(
    payload: PushInventoryRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    validate_aiosell_mapping(client, payload.updates, payload.hotel_code)
    result = client.push_inventory(
        updates=payload.updates,
        hotel_code=payload.hotel_code,
        partner_id=payload.partner_id,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or result.get("error") or "Aiosell Inventory Push failed",
        )
    return result


@router.post("/aiosell/push-rates", dependencies=[Depends(get_current_user)])
def aiosell_push_rates(
    payload: PushRatesRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    validate_aiosell_mapping(client, payload.updates, payload.hotel_code)
    result = client.push_rates(
        updates=payload.updates,
        hotel_code=payload.hotel_code,
        partner_id=payload.partner_id,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or result.get("error") or "Aiosell Rate Push failed",
        )
    return result


@router.post("/aiosell/push-restrictions", dependencies=[Depends(get_current_user)])
def aiosell_push_restrictions(
    payload: PushRestrictionsRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    validate_aiosell_mapping(client, payload.updates, payload.hotel_code)
    if payload.type == "rates":
        result = client.push_rate_restrictions(
            to_channels=payload.to_channels,
            updates=payload.updates,
            hotel_code=payload.hotel_code,
            partner_id=payload.partner_id,
        )
    else:
        result = client.push_inventory_restrictions(
            to_channels=payload.to_channels,
            updates=payload.updates,
            hotel_code=payload.hotel_code,
            partner_id=payload.partner_id,
        )

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or result.get("error") or "Aiosell Restrictions Push failed",
        )
    return result


@router.post("/aiosell/multiplier", dependencies=[Depends(get_current_user)])
def aiosell_channel_multiplier(
    payload: ChannelMultiplierRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    result = client.set_channel_multiplier(
        multiplier=payload.multiplier,
        channels=payload.channels,
        hotel_code=payload.hotel_code,
        partner_id=payload.partner_id,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or result.get("error") or "Aiosell Multiplier update failed",
        )

    # Sync multipliers back to local channel config
    for ch_code in payload.channels:
        local_ch = db.query(ChannelConfig).filter(
            ChannelConfig.tenant_id == tenant_id,
            (ChannelConfig.aiosell_slug == ch_code) | (ChannelConfig.code == ch_code.upper()),
        ).first()
        if local_ch:
            local_ch.rate_multiplier = payload.multiplier
    db.commit()

    return result


@router.post("/aiosell/mark-noshow", dependencies=[Depends(get_current_user)])
def aiosell_mark_noshow(
    payload: MarkNoShowRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    result = client.mark_no_show(
        booking_id=payload.booking_id,
        channel=payload.channel,
        hotel_code=payload.hotel_code,
        partner_id=payload.partner_id,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or result.get("error") or "Mark No Show failed",
        )

    # Update local reservation if found
    res = db.query(Reservation).filter(
        Reservation.tenant_id == tenant_id,
        Reservation.ota_reservation_id == payload.booking_id,
    ).first()
    if res:
        res.status = "No-show"
        if res.room_id:
            room = db.query(Room).filter(Room.id == res.room_id).first()
            if room:
                room.occupancy_status = "Vacant"
                room.current_reservation_id = None
        db.commit()

    return result


@router.post("/aiosell/fetch", dependencies=[Depends(get_current_user)])
def aiosell_fetch_data(
    payload: FetchDataRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    client = configured_aiosell_client(payload.hotel_code, payload.partner_id)
    result = client.fetch_data(
        data_type=payload.data_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        hotel_code=payload.hotel_code,
        partner_id=payload.partner_id,
    )
    return result


# ==========================================
# INBOUND AIOSELL WEBHOOK HANDLER
# ==========================================

def verify_aiosell_basic_auth(authorization: Optional[str]) -> bool:
    """Validates HTTP Basic Auth header sent by Aiosell."""
    if not authorization or not DEFAULT_AIOSELL_USERNAME or not DEFAULT_AIOSELL_PASSWORD:
        return False
    try:
        scheme, credentials = authorization.split(" ", 1)
        if scheme.lower() != "basic":
            return False
        decoded = base64.b64decode(credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
        # Check against configured credentials
        is_user_valid = secrets.compare_digest(username, DEFAULT_AIOSELL_USERNAME)
        is_pass_valid = secrets.compare_digest(password, DEFAULT_AIOSELL_PASSWORD)
        return is_user_valid and is_pass_valid
    except Exception:
        return False


def process_aiosell_webhook(payload: Dict[str, Any], db: Session, local_property_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Core processor for Aiosell webhook (book / modify / cancel).
    Idempotent, strictly handles optional guest fields, and updates state cleanly.
    """
    action = payload.get("action", "").lower()
    booking_id = str(payload.get("bookingId") or "")
    hotel_code = (payload.get("hotelCode") or payload.get("hotel_code") or "").strip()
    channel_name = payload.get("channel", "OTA")

    if not action or not booking_id:
        return {"success": False, "message": "Missing action or bookingId"}

    if action not in {"book", "modify", "cancel"}:
        return {"success": False, "message": "Unsupported reservation action"}

    if not hotel_code:
        return {"success": False, "message": "Missing hotelCode in webhook payload"}

    if not DEFAULT_AIOSELL_HOTEL_CODE or hotel_code.lower() != DEFAULT_AIOSELL_HOTEL_CODE.lower():
        return {"success": False, "message": "Webhook hotel code does not match configured Aiosell hotel"}
    property_id_to_use = local_property_id or AIOSELL_PROPERTY_ID
    if not property_id_to_use:
        return {"success": False, "message": "Aiosell PMS property mapping is not configured"}
    prop = db.query(Property).filter(Property.id == property_id_to_use).first()

    if not prop:
        return {
            "success": False,
            "message": f"Unknown Aiosell hotel code '{hotel_code}' — no matching property found in PMS database",
        }

    tenant_id = prop.tenant_id
    property_id = prop.id

    # 1. ACTION: CANCEL
    if action == "cancel":
        existing_res = db.query(Reservation).filter(
            Reservation.tenant_id == tenant_id,
            Reservation.property_id == property_id,
            Reservation.ota_reservation_id == booking_id,
        ).first()

        if existing_res:
            existing_res.status = "Cancelled"
            if existing_res.room_id:
                room = db.query(Room).filter(Room.id == existing_res.room_id).first()
                if room:
                    room.occupancy_status = "Vacant"
                    room.current_reservation_id = None

            # Mark folio
            folio = db.query(Folio).filter(Folio.reservation_id == existing_res.id).first()
            if folio:
                folio.status = "Closed"

            log = OtaIngestionLog(
                id=f"log-{uuid.uuid4().hex[:8]}",
                tenant_id=tenant_id,
                property_id=property_id,
                channel=channel_name,
                ota_reservation_id=booking_id,
                guest_name=f"{existing_res.guest.first_name} {existing_res.guest.last_name}" if existing_res.guest else "Guest",
                check_in_date=existing_res.check_in_date,
                check_out_date=existing_res.check_out_date,
                total_amount=existing_res.total_amount,
                status="Cancelled",
                method="Aiosell Webhook",
                raw_payload_snippet=json.dumps(payload)[:500],
            )
            db.add(log)
            db.commit()

        return {
            "success": True,
            "message": "Reservation Cancelled Successfully",
        }

    # 2. ACTION: BOOK OR MODIFY
    # Extract guest info (all optional per Rule 11 of aiosell-api-context.md)
    guest_data = payload.get("guest") or {}
    first_name = (guest_data.get("firstName") or "").strip()
    last_name = (guest_data.get("lastName") or "").strip()
    if not first_name and not last_name:
        first_name = "OTA"
        last_name = "Guest"
    elif not first_name:
        first_name = last_name
        last_name = "Guest"
    elif not last_name:
        last_name = "Guest"

    guest_email = guest_data.get("email") or f"{booking_id.lower()}@guest.{channel_name.lower().replace('.', '')}.com"
    guest_phone = guest_data.get("phone") or "+91 98000 00000"

    address_data = guest_data.get("address") or {}
    guest_address = address_data.get("line1") or ""
    guest_city = address_data.get("city") or ""

    guest = db.query(Guest).filter(
        Guest.tenant_id == tenant_id,
        Guest.email == guest_email,
    ).first()

    if not guest:
        guest = Guest(
            id=f"gst-{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_id,
            first_name=first_name,
            last_name=last_name,
            email=guest_email,
            phone=guest_phone,
            address=guest_address,
            city=guest_city,
            nationality="Indian",
            vip_status=False,
            lifetime_stays=1,
            lifetime_revenue=0.0,
            notes=f"Auto-provisioned via Aiosell Channel Manager ({channel_name})",
        )
        db.add(guest)
        db.flush()
    else:
        # Update existing guest with latest info
        guest.first_name = first_name
        guest.last_name = last_name
        if guest_phone:
            guest.phone = guest_phone
        if guest_city:
            guest.city = guest_city

    # Extract dates & stay details
    check_in = payload.get("checkin") or datetime.utcnow().date().isoformat()
    check_out = payload.get("checkout") or (datetime.utcnow().date() + timedelta(days=1)).isoformat()
    try:
        d1 = datetime.strptime(check_in, "%Y-%m-%d")
        d2 = datetime.strptime(check_out, "%Y-%m-%d")
        nights = max(1, (d2 - d1).days)
    except Exception:
        nights = 1

    # Extract amounts
    amount_data = payload.get("amount") or {}
    total_amount = float(amount_data.get("amountAfterTax") or amount_data.get("amountBeforeTax") or 5000.0)
    tax_amount = float(amount_data.get("tax") or 0.0)
    commission_amount = float(amount_data.get("commission") or 0.0)
    nightly_rate = round(total_amount / nights, 2)

    # PAH: true = collect at hotel; false = prepaid
    pah = payload.get("pah", False)
    payment_mode = "Hotel Collect" if pah else "Prepaid OTA"
    payment_status = "Unpaid" if pah else "Paid"
    paid_amount = 0.0 if pah else total_amount
    balance_amount = total_amount if pah else 0.0

    # Room and rate plan resolution
    rooms_data = payload.get("rooms") or []
    first_room_data = rooms_data[0] if rooms_data else {}
    room_code = first_room_data.get("roomCode", "")
    rate_plan_code = first_room_data.get("rateplanCode", "BAR-EP")
    occupancy = first_room_data.get("occupancy") or {}
    adults = int(occupancy.get("adults") or 1)
    children = int(occupancy.get("children") or 0)

    # Free-text special requests (Rule 12: plain text)
    special_requests = payload.get("specialRequests") or ""

    # Room Type lookup with Aiosell mapping
    room_types = db.query(RoomType).filter(RoomType.property_id == property_id).all()
    room_type = None
    if room_code:
        # Check explicit mapping (e.g. executive -> DGV, suite -> EOS)
        mapped_pms_code = AIOSELL_TO_PMS_ROOM_MAP.get(room_code.lower())
        if mapped_pms_code:
            room_type = next((rt for rt in room_types if rt.code.lower() == mapped_pms_code.lower()), None)
        if not room_type:
            room_type = next((rt for rt in room_types if rt.code.lower() == room_code.lower() or room_code.lower() in rt.name.lower()), None)
    if not room_type:
        return {"success": False, "message": f"Aiosell room code '{room_code}' is not mapped to a PMS room type"}

    room_type_id = room_type.id
    room_type_name = room_type.name

    # Room allocation lookup
    vacant_room = (
        db.query(Room)
        .filter(
            Room.property_id == property_id,
            Room.room_type_id == room_type_id,
            Room.occupancy_status == "Vacant",
        )
        .first()
    )

    # Check if this booking exists
    existing_res = db.query(Reservation).filter(
        Reservation.tenant_id == tenant_id,
        Reservation.property_id == property_id,
        Reservation.ota_reservation_id == booking_id,
    ).first()

    # MODIFY: Full state replacement
    if action == "modify" and existing_res:
        existing_res.check_in_date = check_in
        existing_res.check_out_date = check_out
        existing_res.nights = nights
        existing_res.adults = adults
        existing_res.children = children
        existing_res.nightly_rate = nightly_rate
        existing_res.total_amount = total_amount
        existing_res.paid_amount = paid_amount
        existing_res.balance_amount = balance_amount
        existing_res.payment_status = payment_status
        existing_res.rate_plan_code = rate_plan_code
        existing_res.special_requests = special_requests
        existing_res.ota_payment_mode = payment_mode
        existing_res.ota_commission_amount = commission_amount
        existing_res.status = "Confirmed"

        # Update folio
        folio = db.query(Folio).filter(Folio.reservation_id == existing_res.id).first()
        if folio:
            folio.total_charges = total_amount
            folio.total_payments = paid_amount
            folio.total_taxes = tax_amount
            folio.balance = balance_amount

        log = OtaIngestionLog(
            id=f"log-{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_id,
            property_id=property_id,
            channel=channel_name,
            ota_reservation_id=booking_id,
            guest_name=f"{first_name} {last_name}",
            check_in_date=check_in,
            check_out_date=check_out,
            room_type_name=room_type_name,
            total_amount=total_amount,
            commission_amount=commission_amount,
            status="Modified",
            method="Aiosell Webhook",
            raw_payload_snippet=json.dumps(payload)[:500],
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "message": "Reservation Modified Successfully",
        }

    # BOOK (or new modify without prior record)
    if existing_res and action == "book":
        return {
            "success": True,
            "message": "Reservation Updated Successfully",
            "info": "Reservation already exists in PMS",
        }

    # Create new reservation
    ref_code = f"AIO-{channel_name[:3].upper()}-{uuid.uuid4().hex[:5].upper()}"
    res_id = f"res-{uuid.uuid4().hex[:8]}"

    res = Reservation(
        id=res_id,
        tenant_id=tenant_id,
        property_id=property_id,
        ref_code=ref_code,
        guest_id=guest.id,
        room_id=vacant_room.id if vacant_room else None,
        room_number=vacant_room.room_number if vacant_room else "Unassigned",
        room_type_id=room_type_id,
        room_type_name=room_type_name,
        check_in_date=check_in,
        check_out_date=check_out,
        nights=nights,
        adults=adults,
        children=children,
        status="Confirmed",
        booking_source=channel_name,
        nightly_rate=nightly_rate,
        total_amount=total_amount,
        paid_amount=paid_amount,
        balance_amount=balance_amount,
        payment_status=payment_status,
        rate_plan_code=rate_plan_code,
        special_requests=special_requests,
        ota_reservation_id=booking_id,
        ota_commission_amount=commission_amount,
        ota_payment_mode=payment_mode,
        ota_raw_payload=json.dumps(payload)[:2000],
        tags=["Aiosell CM", channel_name],
    )
    db.add(res)
    db.flush()

    if vacant_room:
        vacant_room.occupancy_status = "Reserved"
        vacant_room.current_reservation_id = res.id
        vacant_room.current_guest_name = f"{first_name} {last_name}"

    # Create Folio
    folio_id = f"fol-{uuid.uuid4().hex[:8]}"
    folio = Folio(
        id=folio_id,
        tenant_id=tenant_id,
        reservation_id=res.id,
        reservation_ref=ref_code,
        guest_name=f"{first_name} {last_name}",
        room_number=vacant_room.room_number if vacant_room else "Unassigned",
        total_charges=total_amount,
        total_payments=paid_amount,
        total_taxes=tax_amount,
        balance=balance_amount,
        status="Open",
    )
    db.add(folio)
    db.flush()

    # Room charge item
    item = FolioItem(
        id=f"item-{uuid.uuid4().hex[:8]}",
        tenant_id=tenant_id,
        folio_id=folio.id,
        date=check_in,
        description=f"Accommodation Tariff — {nights} Nights ({room_type_name}) [{channel_name}]",
        category="Room",
        amount=total_amount,
        type="Charge",
        reference=ref_code,
    )
    db.add(item)

    # Ingestion Log
    log = OtaIngestionLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        tenant_id=tenant_id,
        property_id=property_id,
        channel=channel_name,
        ota_reservation_id=booking_id,
        guest_name=f"{first_name} {last_name}",
        check_in_date=check_in,
        check_out_date=check_out,
        room_type_name=room_type_name,
        total_amount=total_amount,
        commission_amount=commission_amount,
        status="Ingested",
        method="Aiosell Webhook",
        raw_payload_snippet=json.dumps(payload)[:500],
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": "Reservation Updated Successfully",
    }


@router.post("/aiosell/webhook")
async def aiosell_inbound_webhook(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Aiosell calls this endpoint when an OTA reservation is created, modified, or cancelled.
    Protected by HTTP Basic Auth as per Aiosell specification.
    """
    if not verify_aiosell_basic_auth(authorization):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid Aiosell Basic Auth credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON body")

    result = process_aiosell_webhook(body, db)
    return result


@router.post("/aiosell/simulate-webhook")
def simulate_aiosell_webhook(
    payload: Dict[str, Any],
    _user=Depends(get_current_user),
    auth: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    """Internal simulator for testing the Aiosell webhook locally or from UI."""
    if not auth.property_id:
        raise HTTPException(status_code=409, detail="Select a property before simulating a webhook")
    return process_aiosell_webhook(payload, db, auth.property_id)
