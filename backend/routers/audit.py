from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_auth_context, AuthContext
from backend.models import AuditLog, StaffMember, generate_id
from backend.schemas import AuditLogResponse, StaffMemberResponse

router = APIRouter(prefix="/api/staff-audit", tags=["Staff Management & Audit Trail"])


class StaffInput(BaseModel):
    name: str
    email: str
    phone: str = ""
    role: str
    propertyId: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    propertyId: Optional[str] = None


class StaffStatus(BaseModel):
    status: str


def require_staff_manager(auth: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if auth.role_code not in ("OWNER", "PROPERTY_MANAGER") and not auth.is_platform_user:
        raise HTTPException(status_code=403, detail="Owner or manager access required")
    if not auth.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return auth


def check_property(auth: AuthContext, property_id: str):
    if property_id not in auth.allowed_property_ids and not auth.is_platform_user:
        raise HTTPException(status_code=403, detail="Property access required")


@router.get("/staff", response_model=List[StaffMemberResponse])
def get_staff_members(
    auth: AuthContext = Depends(require_staff_manager),
    db: Session = Depends(get_db),
):
    query = db.query(StaffMember).filter(StaffMember.tenant_id == auth.tenant_id)
    if not auth.is_platform_user:
        query = query.filter(StaffMember.property_id.in_(auth.allowed_property_ids))
    return query.all()


@router.post("/staff", response_model=StaffMemberResponse, status_code=status.HTTP_201_CREATED)
def add_staff_member(
    payload: StaffInput,
    auth: AuthContext = Depends(require_staff_manager),
    db: Session = Depends(get_db),
):
    check_property(auth, payload.propertyId)
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")
    if "@" not in payload.email:
        raise HTTPException(status_code=422, detail="Valid email is required")
    if db.query(StaffMember).filter(StaffMember.tenant_id == auth.tenant_id, StaffMember.email == payload.email.lower()).first():
        raise HTTPException(status_code=409, detail="Staff email already exists")
    new_id = generate_id("stf")
    staff = StaffMember(
        id=new_id,
        tenant_id=auth.tenant_id,
        property_id=payload.propertyId,
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        role=payload.role,
        status="Active",
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.patch("/staff/{staff_id}", response_model=StaffMemberResponse)
def update_staff_member(
    staff_id: str,
    payload: StaffUpdate,
    auth: AuthContext = Depends(require_staff_manager),
    db: Session = Depends(get_db),
):
    staff = db.query(StaffMember).filter(StaffMember.id == staff_id, StaffMember.tenant_id == auth.tenant_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    check_property(auth, staff.property_id)
    updates = payload.model_dump(exclude_unset=True)
    if "propertyId" in updates:
        check_property(auth, updates.pop("propertyId"))
        staff.property_id = payload.propertyId
    if "email" in updates:
        updates["email"] = updates["email"].strip().lower()
        if "@" not in updates["email"]:
            raise HTTPException(status_code=422, detail="Valid email is required")
        duplicate = db.query(StaffMember).filter(StaffMember.tenant_id == auth.tenant_id, StaffMember.email == updates["email"], StaffMember.id != staff_id).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="Staff email already exists")
    for field, value in updates.items():
        if field == "name" and not value.strip():
            raise HTTPException(status_code=422, detail="Name is required")
        setattr(staff, field, value.strip() if field == "name" else value)
    db.commit()
    db.refresh(staff)
    return staff


@router.patch("/staff/{staff_id}/status")
def update_staff_status(
    staff_id: str,
    payload: StaffStatus,
    auth: AuthContext = Depends(require_staff_manager),
    db: Session = Depends(get_db),
):
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.tenant_id == auth.tenant_id,
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    check_property(auth, staff.property_id)
    new_status = payload.status
    if new_status not in ("Active", "Inactive"):
        raise HTTPException(status_code=422, detail="Invalid staff status")
    staff.status = new_status
    db.commit()

    return {"message": "Staff status updated", "status": new_status}


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    auth: AuthContext = Depends(require_staff_manager),
    db: Session = Depends(get_db),
):
    return db.query(AuditLog).filter(AuditLog.tenant_id == auth.tenant_id).order_by(AuditLog.timestamp.desc()).all()
