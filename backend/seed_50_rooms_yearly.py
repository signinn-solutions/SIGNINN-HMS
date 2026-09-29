import os
import sys
import uuid
import random
from pathlib import Path
from datetime import datetime, timedelta

# Ensure backend can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import engine, SessionLocal, Base
from backend.security import hash_password
from backend.models import (
    Tenant,
    Property,
    RoomType,
    Room,
    Guest,
    Reservation,
    Folio,
    FolioItem,
    Payment,
    Invoice,
    HousekeepingTask,
    MaintenanceTicket,
    ChannelConfig,
    RatePlan,
    StaffMember,
    AuditLog,
    User,
    Role,
    Permission,
    RolePermission,
    TenantMembership,
    PropertyAccess,
    OtaIngestionLog,
    MessageThread,
    Message,
)

INDIAN_FIRST_NAMES = [
    "Aarav", "Aditya", "Rohan", "Kabir", "Vikram", "Siddharth", "Arjun", "Dev", "Karan", "Nikhil",
    "Priya", "Ananya", "Pooja", "Neha", "Rhea", "Tanvi", "Isha", "Meera", "Divya", "Sneha",
    "Rahul", "Amit", "Gaurav", "Manish", "Sunil", "Rajesh", "Deepak", "Sanjay", "Anil", "Varun",
    "Shreya", "Kavita", "Ritu", "Preeti", "Swati", "Rashmi", "Simran", "Jyoti", "Nandini", "Pallavi"
]

INDIAN_LAST_NAMES = [
    "Mehta", "Sharma", "Singhal", "Patel", "Verma", "Rao", "Nair", "Iyer", "Chopra", "Deshmukh",
    "Agarwal", "Bansal", "Reddy", "Kulkarni", "Joshi", "Bhatia", "Kapoor", "Malhotra", "Saxena", "Menon",
    "Singhania", "Gupta", "Chatterjee", "Mukherjee", "Banerjee", "Dutta", "Goswami", "Pandey", "Mishra", "Trivedi"
]

INTL_GUESTS = [
    ("David", "Miller", "d.miller@consulting.co.uk", "+44 7700 900123", "British", "London", "Passport", "GB7891024"),
    ("Sophie", "Laurent", "s.laurent@parisart.fr", "+33 612 345678", "French", "Paris", "Passport", "FR4419201"),
    ("Marcus", "Weber", "m.weber@berlinfin.de", "+49 151 234567", "German", "Munich", "Passport", "DE9928103"),
    ("Elena", "Rostova", "elena.r@nordictrade.se", "+46 70 123 4567", "Swedish", "Stockholm", "Passport", "SE1289401"),
    ("Kenji", "Takahashi", "k.takahashi@tokyotech.jp", "+81 90 1234 5678", "Japanese", "Tokyo", "Passport", "JP8829104"),
    ("Liam", "O'Connor", "liam.oc@dublindesign.ie", "+353 87 123 4567", "Irish", "Dublin", "Passport", "IE5519202"),
    ("Chloe", "Smith", "chloe.smith@sydneyadvisory.com.au", "+61 412 345 678", "Australian", "Sydney", "Passport", "AU9182049"),
    ("Alexander", "Wright", "a.wright@nycinvest.com", "+1 212 555 0192", "American", "New York", "Passport", "US3382910"),
]

INDIAN_CITIES = [
    "Mumbai", "New Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Ahmedabad",
    "Kolkata", "Jaipur", "Chandigarh", "Surat", "Lucknow", "Indore", "Kochi"
]

PREFERENCES_POOL = [
    "High Floor", "Quiet Room", "Extra Pillow", "Late Checkout", "Early Checkin",
    "King Bed", "Non-smoking", "Airport Pickup", "Sea Facing", "Fruit Basket",
    "Vegetarian Breakfast", "Twin Beds", "Balcony Room", "Espresso Machine"
]

CHANNELS = [
    ("Direct Website", 0.30, 0.0),
    ("Booking.com", 0.28, 15.0),
    ("MakeMyTrip", 0.22, 18.0),
    ("Agoda", 0.10, 16.0),
    ("Airbnb", 0.05, 14.0),
    ("Walk-in", 0.05, 0.0),
]


def seed_50_rooms_yearly():
    print("=" * 70)
    print("RESETTING DATABASE AND SEEDING 50 ROOMS WITH SEPTEMBER 21-30 RESERVATIONS")
    print("=" * 70)

    # 1. Recreate tables cleanly
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 2. Permissions and Roles (RBAC)
    print("[1/8] Seeding normalized permissions & system roles...")
    permissions_data = [
        ("reservation.view", "PROPERTY", "View reservations"),
        ("reservation.create", "PROPERTY", "Create reservations"),
        ("reservation.modify", "PROPERTY", "Modify reservations"),
        ("reservation.cancel", "PROPERTY", "Cancel reservations"),
        ("stay.view", "PROPERTY", "View stays"),
        ("stay.checkin", "PROPERTY", "Perform guest check-in"),
        ("stay.checkout", "PROPERTY", "Perform guest check-out"),
        ("stay.room_move", "PROPERTY", "Execute room move"),
        ("guest.view", "PROPERTY", "View guest profiles"),
        ("guest.create", "PROPERTY", "Create guest profile"),
        ("guest.modify", "PROPERTY", "Modify guest profile"),
        ("folio.view", "PROPERTY", "View billing folios"),
        ("folio.charge", "PROPERTY", "Post charges to folios"),
        ("folio.adjust", "PROPERTY", "Apply adjustments/discounts to folios"),
        ("folio.transfer", "PROPERTY", "Transfer folio charges"),
        ("payment.view", "PROPERTY", "View payments"),
        ("payment.collect", "PROPERTY", "Collect guest payments"),
        ("payment.refund", "PROPERTY", "Issue payment refunds"),
        ("room.view", "PROPERTY", "View room list and tape chart"),
        ("room.modify", "PROPERTY", "Modify room details"),
        ("housekeeping.view", "PROPERTY", "View housekeeping tasks"),
        ("housekeeping.update", "PROPERTY", "Update housekeeping status"),
        ("housekeeping.inspect", "PROPERTY", "Inspect and approve clean rooms"),
        ("maintenance.view", "PROPERTY", "View maintenance tickets"),
        ("maintenance.create", "PROPERTY", "Create maintenance tickets"),
        ("maintenance.update", "PROPERTY", "Resolve maintenance tickets"),
        ("rate.view", "PROPERTY", "View rate plans"),
        ("rate.modify", "PROPERTY", "Modify rate plans"),
        ("inventory.view", "PROPERTY", "View availability and inventory"),
        ("inventory.modify", "PROPERTY", "Modify inventory restrictions"),
        ("distribution.view", "PROPERTY", "View channel distribution"),
        ("distribution.manage", "PROPERTY", "Manage OTA channels"),
        ("report.operational.view", "PROPERTY", "View operational reports"),
        ("report.financial.view", "PROPERTY", "View financial and revenue reports"),
        ("staff.view", "TENANT", "View staff directory"),
        ("staff.manage", "TENANT", "Invite and manage staff"),
        ("property.settings.view", "PROPERTY", "View property settings"),
        ("property.settings.manage", "PROPERTY", "Manage property settings"),
        ("tenant.settings.view", "TENANT", "View tenant organization settings"),
        ("tenant.settings.manage", "TENANT", "Manage tenant organization settings"),
        ("audit.view", "TENANT", "View security and audit log"),
    ]
    perm_map = {}
    for code, scope, desc in permissions_data:
        p = Permission(id=f"perm-{code.replace('.', '-')}", code=code, scope=scope, description=desc)
        db.add(p)
        perm_map[code] = p

    roles_def = [
        ("role-owner", "OWNER", "Hotel Owner / Group Admin", "Full tenant-wide administrative authority", [p[0] for p in permissions_data]),
        ("role-gm", "GENERAL_MANAGER", "General Manager / Property Manager", "Full operational authority over assigned properties", [p[0] for p in permissions_data if not p[0].startswith("tenant.settings")]),
        ("role-frontdesk", "FRONT_DESK", "Front Desk Agent / Receptionist", "Check-in/out, folios, payments, room assignment", [
            "reservation.view", "reservation.create", "reservation.modify",
            "stay.view", "stay.checkin", "stay.checkout", "stay.room_move",
            "guest.view", "guest.create", "guest.modify",
            "folio.view", "folio.charge", "folio.adjust", "payment.view", "payment.collect",
            "room.view", "housekeeping.view", "maintenance.view", "maintenance.create"
        ]),
        ("role-housekeeping", "HOUSEKEEPING_SUPERVISOR", "Housekeeping Supervisor", "Room cleaning, inspection, and maintenance tracking", [
            "room.view", "housekeeping.view", "housekeeping.update", "housekeeping.inspect",
            "maintenance.view", "maintenance.create", "maintenance.update"
        ]),
        ("role-nightaudit", "NIGHT_AUDITOR", "Night Auditor", "End of day processing, room rate posting, reporting", [
            "reservation.view", "stay.view", "folio.view", "folio.charge", "payment.view",
            "report.operational.view", "report.financial.view", "audit.view"
        ]),
    ]
    for r_id, code, name, desc, perms in roles_def:
        role = Role(id=r_id, tenant_id=None, code=code, name=name, description=desc, is_system_role=True)
        for p_code in perms:
            if p_code in perm_map:
                role.permissions.append(perm_map[p_code])
        db.add(role)
    db.commit()

    # 3. Tenants & Multi-Property
    print("[2/8] Provisioning tenant & properties...")
    tenant = Tenant(
        id="tenant-1",
        name="Grand Azure Resort & Spa",
        slug="grand-azure",
        subdomain="grandazure.signinn.app",
        owner_name="Vikramaditya Roy",
        owner_email="roy@grandazure.com",
        owner_phone="+91 98201 55432",
        plan="Enterprise",
        status="Active",
        billing_cycle="Annual",
        mrr=19999.0,
        joined_date="2025-01-10",
        renewal_date="2027-01-10",
        max_rooms=60,
        total_rooms_active=50,
        properties_count=1,
        primary_property_id="prop-1",
        features={
            "otaChannelManager": True,
            "directBookingEngine": True,
            "whatsappAutomations": True,
            "multiProperty": True,
            "qrRoomService": True,
            "advancedAnalytics": True,
            "aiPricing": True,
            "housekeepingApp": True,
        },
        monthly_gmv=4850000.0,
        monthly_bookings=310,
    )
    db.add(tenant)

    # Secondary tenant for multi-tenant demo
    tenant_2 = Tenant(
        id="tenant-2",
        name="Mountain Peak Boutique Inn",
        slug="mountain-peak",
        subdomain="mountainpeak.signinn.app",
        owner_name="Ananya Sharma",
        owner_email="ananya@mountainpeak.in",
        owner_phone="+91 94180 88214",
        plan="Professional",
        status="Active",
        billing_cycle="Monthly",
        mrr=7999.0,
        joined_date="2025-08-15",
        renewal_date="2026-10-15",
        max_rooms=30,
        total_rooms_active=20,
        properties_count=1,
        primary_property_id="prop-2",
        features={"otaChannelManager": True, "directBookingEngine": True, "housekeepingApp": True},
        monthly_gmv=540000.0,
        monthly_bookings=68,
    )
    db.add(tenant_2)
    db.commit()

    prop_1 = Property(
        id="prop-1",
        tenant_id="tenant-1",
        name="Grand Azure Resort & Spa, North Goa",
        code="GA-GOA",
        city="Candolim, Goa",
        state="Goa",
        address="Pinnacle Cliff, Sinquerim Road, Candolim 403515",
        phone="+91 832 249 9000",
        email="reservations@grandazuregoa.com",
        currency="INR",
        timezone="Asia/Kolkata",
        total_rooms=50,
        rating=4.9,
        gstin="30AAAAA0000A1Z5",
        inbound_email_alias="ota+prop-1@inbound.signinn.app",
        ical_token="ga-goa-cal-token",
    )
    db.add(prop_1)

    prop_1b = Property(
        id="prop-1b",
        tenant_id="tenant-1",
        name="Grand Azure Heritage Beachfront",
        code="GA-GOA2",
        city="Goa",
        state="Goa",
        address="Candolim Beach Road, North Goa",
        phone="+91 832 248 9911",
        email="goa@grandazure.com",
        currency="INR",
        timezone="Asia/Kolkata",
        total_rooms=25,
        rating=4.9,
        gstin="30AAAAA0000A1Z5",
    )
    db.add(prop_1b)

    prop_2 = Property(
        id="prop-2",
        tenant_id="tenant-2",
        name="Mountain Peak Boutique Inn, Manali",
        code="MP-MNL",
        city="Old Manali",
        state="Himachal Pradesh",
        address="Club House Road, Old Manali 175131",
        phone="+91 1902 252 110",
        email="stay@mountainpeak.in",
        currency="INR",
        timezone="Asia/Kolkata",
        total_rooms=20,
        rating=4.7,
        gstin="02AAAAA1111B1Z2",
    )
    db.add(prop_2)
    db.commit()

    # Users
    pwd_hash = hash_password("password123")
    users = [
        User(id="usr-superadmin", email="superadmin@signinn.com", hashed_password=pwd_hash, name="Vikramaditya Roy", phone="+91 98201 00000", is_platform_user=True, platform_role="SIGNINN Super Admin", status="Active"),
        User(id="usr-owner", email="alex.morgan@grandazure.com", hashed_password=pwd_hash, name="Alex Morgan", phone="+91 98201 55432", is_platform_user=False, status="Active"),
        User(id="usr-gm", email="rohit.gm@grandazure.com", hashed_password=pwd_hash, name="Rohit Verma", phone="+91 98110 44321", is_platform_user=False, status="Active"),
        User(id="usr-frontdesk", email="priya.desk@grandazure.com", hashed_password=pwd_hash, name="Priya Sharma", phone="+91 98765 43210", is_platform_user=False, status="Active"),
        User(id="usr-nightaudit", email="kiran.audit@grandazure.com", hashed_password=pwd_hash, name="Kiran Patel", phone="+91 98450 11223", is_platform_user=False, status="Active"),
        User(id="usr-housekeeping", email="sunita.clean@grandazure.com", hashed_password=pwd_hash, name="Sunita Rao", phone="+91 98330 99887", is_platform_user=False, status="Active"),
    ]
    for u in users:
        db.add(u)
    db.commit()

    # Memberships & Access
    user_roles = [
        ("usr-owner", "role-owner"),
        ("usr-gm", "role-gm"),
        ("usr-frontdesk", "role-frontdesk"),
        ("usr-nightaudit", "role-nightaudit"),
        ("usr-housekeeping", "role-housekeeping"),
    ]
    for uid, rid in user_roles:
        mem = TenantMembership(id=f"mem-{uid}", tenant_id="tenant-1", user_id=uid, role_id=rid, status="Active")
        db.add(mem)
        pa = PropertyAccess(id=f"pa-{uid}-prop1", membership_id=f"mem-{uid}", property_id="prop-1")
        db.add(pa)
    db.commit()

    # 4. Room Types (4 distinct tiers summing to 50 rooms)
    print("[3/8] Configuring 4 room tiers across 50 rooms...")
    room_types_def = [
        ("rt-101", "Deluxe Garden View", "DGV", 5500.0, 2, "1 King or 2 Twins", 340, 15, "Private veranda with lush tropical garden view.", ["Garden View", "Balcony", "Free Wi-Fi", "Tea Maker", "Rain Shower"]),
        ("rt-102", "Deluxe Sea View", "DSV", 7800.0, 2, "1 King Bed", 410, 15, "Direct unobstructed view of the Arabian Sea sunset.", ["Sea View", "Balcony", "King Bed", "Minibar", "Bathtub", "Smart TV"]),
        ("rt-103", "Executive Ocean Suite", "EOS", 12500.0, 3, "1 King + 1 Sofa Bed", 580, 12, "Separate living lounge, espresso bar, and wrap-around terrace.", ["Panoramic Sea View", "Living Room", "Espresso Machine", "Whirlpool Bath", "Lounge Access"]),
        ("rt-104", "Presidential Pool Villa", "PPV", 24000.0, 4, "2 King Beds", 1200, 8, "Private plunge pool, personal butler, and direct private beach trail.", ["Private Pool", "Butler Service", "Jacuzzi", "Kitchenette", "Sun Deck", "Cabana"]),
    ]
    room_types_map = {}
    for rtid, name, code, price, occ, bed, sqft, total, desc, amens in room_types_def:
        rt = RoomType(
            id=rtid,
            tenant_id="tenant-1",
            property_id="prop-1",
            name=name,
            code=code,
            base_price=price,
            max_occupancy=occ,
            bed_configuration=bed,
            size_sq_ft=sqft,
            description=desc,
            amenities=amens,
            total_inventory=total,
            available_count=total,
        )
        db.add(rt)
        room_types_map[rtid] = rt
    db.commit()

    # 5. Exactly 50 Physical Rooms
    print("[4/8] Building 50 physical rooms across 5 floors...")
    # Distribution:
    # Floor 1: 101-110 -> 10 x DGV (rt-101)
    # Floor 2: 201-205 -> 5 x DGV (rt-101) [Total DGV = 15]
    #          206-210 -> 5 x DSV (rt-102)
    # Floor 3: 301-310 -> 10 x DSV (rt-102) [Total DSV = 15]
    # Floor 4: 401-410 -> 10 x EOS (rt-103)
    # Floor 5: 501-502 -> 2 x EOS (rt-103) [Total EOS = 12]
    #          503-510 -> 8 x PPV (rt-104) [Total PPV = 8]
    # Total = 10 + 10 + 10 + 10 + 10 = 50 rooms!
    room_specs = []
    # Floor 1
    for i in range(1, 11):
        room_specs.append((f"10{i}" if i < 10 else f"1{i}", 1, "rt-101", "Deluxe Garden View"))
    # Floor 2
    for i in range(1, 6):
        room_specs.append((f"20{i}", 2, "rt-101", "Deluxe Garden View"))
    for i in range(6, 11):
        room_specs.append((f"20{i}" if i < 10 else f"2{i}", 2, "rt-102", "Deluxe Sea View"))
    # Floor 3
    for i in range(1, 11):
        room_specs.append((f"30{i}" if i < 10 else f"3{i}", 3, "rt-102", "Deluxe Sea View"))
    # Floor 4
    for i in range(1, 11):
        room_specs.append((f"40{i}" if i < 10 else f"4{i}", 4, "rt-103", "Executive Ocean Suite"))
    # Floor 5
    for i in range(1, 3):
        room_specs.append((f"50{i}", 5, "rt-103", "Executive Ocean Suite"))
    for i in range(3, 11):
        room_specs.append((f"50{i}" if i < 10 else f"5{i}", 5, "rt-104", "Presidential Pool Villa"))

    assert len(room_specs) == 50, f"Expected 50 rooms, got {len(room_specs)}"

    rooms_list = []
    for rnum, flr, rtid, rtname in room_specs:
        rm = Room(
            id=f"rm-{rnum}",
            tenant_id="tenant-1",
            property_id="prop-1",
            room_number=rnum,
            floor=flr,
            room_type_id=rtid,
            room_type_name=rtname,
            occupancy_status="Vacant",
            housekeeping_status="Clean",
            maintenance_status="Operational",
            key_card_assigned=False,
            notes="",
        )
        db.add(rm)
        rooms_list.append(rm)
    db.commit()

    # 6. Channels and Rate Plans
    print("[5/8] Configuring OTA Channels and Rate Plans...")
    channels_data = [
        # --- 18 OTAs ---
        ("ch-1", "Booking.com", "BDC", "Connected", 15.0, 1.0, 1420000.0, 108, 48, "ota+ch-1@inbound.signinn.app", "OTA", "booking.com"),
        ("ch-2", "GoMMT (MakeMyTrip & Goibibo)", "GOMMT", "Connected", 18.0, 1.0, 980000.0, 84, 32, "ota+ch-2@inbound.signinn.app", "OTA", "gommt"),
        ("ch-3", "Agoda", "AGD", "Connected", 16.0, 1.0, 410000.0, 36, 14, "ota+ch-3@inbound.signinn.app", "OTA", "agoda"),
        ("ch-4", "Airbnb", "ABNB", "Connected", 14.0, 1.05, 290000.0, 22, 11, "ota+ch-4@inbound.signinn.app", "OTA", "airbnb"),
        ("ch-5", "Expedia", "EXPD", "Connected", 18.0, 1.0, 310000.0, 26, 9, "ota+ch-5@inbound.signinn.app", "OTA", "expedia"),
        ("ch-6", "Cleartrip", "CLTR", "Connected", 15.0, 1.0, 180000.0, 18, 6, "ota+ch-6@inbound.signinn.app", "OTA", "cleartrip"),
        ("ch-7", "Ease My Trip", "EMT", "Connected", 12.0, 1.0, 140000.0, 15, 5, "ota+ch-7@inbound.signinn.app", "OTA", "easemytrip"),
        ("ch-8", "CTrip / Trip.com", "CTRP", "Connected", 15.0, 1.0, 165000.0, 14, 4, "ota+ch-8@inbound.signinn.app", "OTA", "ctrip"),
        ("ch-9", "HotelBeds", "HTBD", "Connected", 20.0, 1.10, 210000.0, 19, 8, "ota+ch-9@inbound.signinn.app", "OTA", "hotelbeds"),
        ("ch-10", "HostelWorld", "HSTL", "Connected", 15.0, 1.0, 85000.0, 11, 3, "ota+ch-10@inbound.signinn.app", "OTA", "hostelworld"),
        ("ch-11", "HappyEasyGo", "HEGO", "Connected", 14.0, 1.0, 92000.0, 10, 2, "ota+ch-11@inbound.signinn.app", "OTA", "happyeasygo"),
        ("ch-12", "Tiket", "TIKT", "Connected", 15.0, 1.0, 78000.0, 8, 2, "ota+ch-12@inbound.signinn.app", "OTA", "tiket"),
        ("ch-13", "Traveloka", "TVLK", "Connected", 15.0, 1.0, 105000.0, 12, 3, "ota+ch-13@inbound.signinn.app", "OTA", "traveloka"),
        ("ch-14", "Travelguru", "TGRU", "Connected", 16.0, 1.0, 56000.0, 6, 1, "ota+ch-14@inbound.signinn.app", "OTA", "travelguru"),
        ("ch-15", "Travolounge", "TRVL", "Connected", 15.0, 1.0, 42000.0, 5, 1, "ota+ch-15@inbound.signinn.app", "OTA", "travolounge"),
        ("ch-16", "VHS Hub", "VHSH", "Connected", 15.0, 1.0, 38000.0, 4, 1, "ota+ch-16@inbound.signinn.app", "OTA", "vhshub"),
        ("ch-17", "Bookings Maker", "BKMK", "Connected", 14.0, 1.0, 31000.0, 3, 1, "ota+ch-17@inbound.signinn.app", "OTA", "bookingsmaker"),
        ("ch-18", "Reconline", "RECN", "Connected", 15.0, 1.0, 28000.0, 3, 1, "ota+ch-18@inbound.signinn.app", "OTA", "reconline"),
        # --- 2 Channel Managers ---
        ("ch-19", "eZee Technosys", "EZEE", "Connected", 0.0, 1.0, 0.0, 0, 0, None, "CM", "ezee"),
        ("ch-20", "Hotelierguru", "HGRU", "Connected", 0.0, 1.0, 0.0, 0, 0, None, "CM", "hotelierguru"),
        # --- 3 Booking Engines ---
        ("ch-21", "Simplotel", "SMPL", "Connected", 3.0, 1.0, 175000.0, 18, 5, None, "Booking Engine", "simplotel"),
        ("ch-22", "Travelanium", "TRVLN", "Connected", 3.5, 1.0, 88000.0, 9, 2, None, "Booking Engine", "travelanium"),
        ("ch-23", "Aiolia BE", "AIOL", "Connected", 3.0, 1.0, 122000.0, 14, 4, None, "Booking Engine", "aiolia"),
        # --- 3 OTA Aggregators ---
        ("ch-24", "Bakuun", "BAKN", "Connected", 10.0, 1.0, 70000.0, 8, 2, None, "OTA Aggregator", "bakuun"),
        ("ch-25", "RateDock", "RDCK", "Connected", 12.0, 1.0, 58000.0, 6, 2, None, "OTA Aggregator", "ratedock"),
        ("ch-26", "HyperGuest", "HYPR", "Connected", 11.0, 1.0, 96000.0, 10, 3, None, "OTA Aggregator", "hyperguest"),
    ]
    for cid, cname, code, status, comm, mult, rev, bks, auto_cnt, alias, cat, slug in channels_data:
        ch = ChannelConfig(
            id=cid,
            tenant_id="tenant-1",
            channel_name=cname,
            code=code,
            status=status,
            last_sync="Just now",
            mapped_room_types=4,
            total_room_types=4,
            mapped_rate_plans=3,
            total_rate_plans=3,
            commission_rate=comm,
            rate_multiplier=mult,
            revenue_this_month=rev,
            bookings_this_month=bks,
            active_listings=4,
            category=cat,
            aiosell_slug=slug,
            auto_ingested_count=auto_cnt,
            inbound_email_alias=alias,
            last_email_received_at=datetime.utcnow().isoformat(),
        )
        db.add(ch)

    rate_plans = [
        RatePlan(id="rp-1", tenant_id="tenant-1", code="BAR-EP", name="Best Available Rate (Room Only)", meal_plan="EP", base_price_multiplier=1.0, cancellation_policy="Free cancellation up to 48h prior", min_stay=1),
        RatePlan(id="rp-2", tenant_id="tenant-1", code="BAR-CP", name="Bed & Gourmet Breakfast", meal_plan="CP", base_price_multiplier=1.12, cancellation_policy="Free cancellation up to 24h prior", min_stay=1),
        RatePlan(id="rp-3", tenant_id="tenant-1", code="BAR-MAP", name="Half Board (Breakfast + Dinner)", meal_plan="MAP", base_price_multiplier=1.28, cancellation_policy="Non-refundable special package", min_stay=2),
        RatePlan(id="rp-101", tenant_id="tenant-1", code="CORP-FLEX", name="Corporate Flexible Rate", meal_plan="CP", base_price_multiplier=1.05, cancellation_policy="Free cancellation up to 24h prior", min_stay=1),
    ]
    for rp in rate_plans:
        db.add(rp)
    db.commit()

    # 7. Guests Pool (Create 80 diverse, realistic guests)
    print("[6/8] Generating realistic Guest CRM profiles...")
    guests_pool = []
    # Add internationals
    for fname, lname, email, phone, nat, city, idt, idn in INTL_GUESTS:
        gst = Guest(
            id=f"gst-{uuid.uuid4().hex[:8]}",
            tenant_id="tenant-1",
            first_name=fname,
            last_name=lname,
            email=email,
            phone=phone,
            id_type=idt,
            id_number=idn,
            nationality=nat,
            vip_status=random.random() < 0.4,
            lifetime_stays=random.randint(2, 6),
            lifetime_revenue=random.choice([45000.0, 78000.0, 120000.0, 185000.0]),
            preferences=random.sample(PREFERENCES_POOL, k=random.randint(2, 4)),
            city=city,
            notes="International leisure traveler",
        )
        db.add(gst)
        guests_pool.append(gst)

    # Add Indian guests
    for i in range(72):
        fname = random.choice(INDIAN_FIRST_NAMES)
        lname = random.choice(INDIAN_LAST_NAMES)
        city = random.choice(INDIAN_CITIES)
        email = f"{fname.lower()}.{lname.lower()}{random.randint(10, 99)}@{random.choice(['gmail.com', 'outlook.com', 'yahoo.in', 'techcorp.in'])}"
        phone = f"+91 {random.randint(97000, 99999)} {random.randint(10000, 99999)}"
        gst = Guest(
            id=f"gst-{uuid.uuid4().hex[:8]}",
            tenant_id="tenant-1",
            first_name=fname,
            last_name=lname,
            email=email,
            phone=phone,
            id_type="Aadhaar",
            id_number=f"XXXX-XXXX-{random.randint(1000, 9999)}",
            nationality="Indian",
            vip_status=random.random() < 0.25,
            lifetime_stays=random.randint(1, 8),
            lifetime_revenue=float(random.randint(15000, 240000)),
            preferences=random.sample(PREFERENCES_POOL, k=random.randint(1, 3)),
            city=city,
            notes="Loyalty guest" if random.random() < 0.3 else "",
        )
        db.add(gst)
        guests_pool.append(gst)
    db.commit()

    # Ten days of linked reservations, ending September 30, 2026.
    print("[7/8] Generating reservations for September 21-30, 2026...")
    TODAY = datetime.now().date()
    START_DATE = datetime(2026, 9, 21).date()
    END_DATE = datetime(2026, 10, 1).date()  # exclusive

    reservations_count = 0
    folios_count = 0
    payments_count = 0
    ota_logs_count = 0

    # For each room, simulate a continuous chain within the seed window.
    random.seed(42)  # Deterministic repeatability

    occupied_rooms_today = []
    reserved_rooms_today = []

    for rm in rooms_list:
        rt = room_types_map[rm.room_type_id]
        base_rate = rt.base_price

        curr_date = START_DATE + timedelta(days=random.randint(0, 4))

        while curr_date < END_DATE:
            # Length of stay: 2 to 4 nights
            nights = random.choice([2, 2, 3, 3, 4, 1, 5])
            check_in = curr_date
            check_out = min(curr_date + timedelta(days=nights), END_DATE)
            nights = (check_out - check_in).days

            # Turnaround gap before next booking: 0 to 2 days (average ~75% room occupancy)
            gap = random.choice([0, 0, 1, 1, 2, 3])
            next_date = check_out + timedelta(days=gap)

            # Determine booking source
            ch_choice = random.choices(
                population=[c[0] for c in CHANNELS],
                weights=[c[1] for c in CHANNELS],
                k=1
            )[0]
            comm_rate = next(c[2] for c in CHANNELS if c[0] == ch_choice)

            # Rate plan & price calculation
            rp = random.choice(rate_plans)
            nightly_rate = round(base_rate * rp.base_price_multiplier, 2)
            total_room_charge = round(nightly_rate * nights, 2)
            comm_amount = round((total_room_charge * comm_rate) / 100.0, 2)

            # Guest
            guest = random.choice(guests_pool)

            # Determine reservation status based on date
            res_id = f"res-{uuid.uuid4().hex[:8]}"
            ref_code = f"SGN-{check_in.strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"

            if check_out <= TODAY:
                # Past stay
                status = "Checked Out"
                payment_status = "Paid"
                paid_amount = total_room_charge
                balance_amount = 0.0
            elif check_in <= TODAY < check_out:
                # Currently in-house!
                status = "Checked In"
                payment_status = random.choice(["Paid", "Partially Paid"])
                paid_amount = total_room_charge if payment_status == "Paid" else round(total_room_charge * 0.5, 2)
                balance_amount = round(total_room_charge - paid_amount, 2)
                occupied_rooms_today.append((rm, res_id, f"{guest.first_name} {guest.last_name}"))
            elif check_in == TODAY:
                # Arriving today
                status = "Confirmed"
                payment_status = random.choice(["Paid", "Unpaid"])
                paid_amount = total_room_charge if payment_status == "Paid" else 0.0
                balance_amount = round(total_room_charge - paid_amount, 2)
                reserved_rooms_today.append((rm, res_id, f"{guest.first_name} {guest.last_name}"))
            else:
                # Future booking
                status = "Confirmed"
                payment_status = random.choice(["Paid", "Unpaid", "Partially Paid"])
                paid_amount = total_room_charge if payment_status == "Paid" else (round(total_room_charge * 0.2, 2) if payment_status == "Partially Paid" else 0.0)
                balance_amount = round(total_room_charge - paid_amount, 2)

            ota_res_id = f"{ch_choice[:3].upper()}-{uuid.uuid4().hex[:7].upper()}" if ch_choice != "Direct Website" and ch_choice != "Walk-in" else None

            res = Reservation(
                id=res_id,
                tenant_id="tenant-1",
                property_id="prop-1",
                ref_code=ref_code,
                guest_id=guest.id,
                room_id=rm.id,
                room_number=rm.room_number,
                room_type_id=rt.id,
                room_type_name=rt.name,
                check_in_date=check_in.isoformat(),
                check_out_date=check_out.isoformat(),
                nights=nights,
                adults=random.randint(1, rt.max_occupancy),
                children=random.choice([0, 0, 1]),
                status=status,
                booking_source=ch_choice,
                nightly_rate=nightly_rate,
                total_amount=total_room_charge,
                paid_amount=paid_amount,
                balance_amount=balance_amount,
                payment_status=payment_status,
                rate_plan_code=rp.code,
                ota_reservation_id=ota_res_id,
                ota_commission_rate=comm_rate,
                ota_commission_amount=comm_amount,
                ota_payment_mode="Virtual Card (VCC)" if "Booking" in ch_choice or "Agoda" in ch_choice else ("Hotel Collect" if "MakeMyTrip" in ch_choice else "Direct Gateway"),
                special_requests=random.choice(PREFERENCES_POOL) if random.random() < 0.5 else "",
                tags=[ch_choice] + (["VIP"] if guest.vip_status else []),
            )
            db.add(res)
            reservations_count += 1

            # Create Folio & Folio Items
            folio_id = "fol-101" if reservations_count == 1 else f"fol-{uuid.uuid4().hex[:8]}"
            gst_rate = 0.12 if nightly_rate < 7500 else 0.18
            tax_amt = round(total_room_charge - (total_room_charge / (1 + gst_rate)), 2)

            folio = Folio(
                id=folio_id,
                tenant_id="tenant-1",
                reservation_id=res.id,
                reservation_ref=ref_code,
                guest_name=f"{guest.first_name} {guest.last_name}",
                room_number=rm.room_number,
                total_charges=total_room_charge,
                total_payments=paid_amount,
                total_taxes=tax_amt,
                balance=balance_amount,
                status="Closed" if status == "Checked Out" else "Open",
            )
            db.add(folio)
            folios_count += 1

            # Room charge folio item
            room_item = FolioItem(
                id=f"item-{uuid.uuid4().hex[:8]}",
                tenant_id="tenant-1",
                folio_id=folio.id,
                date=check_in.isoformat(),
                description=f"Accommodation Tariff — {nights} Nights ({rt.name}) [SAC 996311]",
                category="Room",
                amount=total_room_charge,
                type="Charge",
                reference=ref_code,
            )
            db.add(room_item)

            # Incidental charges for ~35% of completed / in-house stays
            if (status == "Checked Out" or status == "Checked In") and random.random() < 0.35:
                incidentals = [
                    ("In-Room Dining — Chef's Coastal Dinner (SAC 996331)", "Food & Beverage", random.choice([1650.0, 2450.0, 3200.0])),
                    ("Ayurvedic Spa & Wellness Rejuvenation (SAC 999721)", "Spa", random.choice([2800.0, 4500.0])),
                    ("Airport Chauffeur Transfer (SAC 996412)", "Misc", 2200.0),
                    ("Laundry & Garment Care Express (SAC 999719)", "Laundry", random.choice([650.0, 950.0])),
                ]
                inc_desc, inc_cat, inc_amt = random.choice(incidentals)
                folio.total_charges += inc_amt
                if status == "Checked Out":
                    folio.total_payments += inc_amt
                else:
                    folio.balance += inc_amt
                    res.total_amount += inc_amt
                    res.balance_amount += inc_amt

                inc_item = FolioItem(
                    id=f"item-{uuid.uuid4().hex[:8]}",
                    tenant_id="tenant-1",
                    folio_id=folio.id,
                    date=check_in.isoformat(),
                    description=inc_desc,
                    category=inc_cat,
                    amount=inc_amt,
                    type="Charge",
                    reference=f"POS-{uuid.uuid4().hex[:4].upper()}",
                )
                db.add(inc_item)

            # Payment record if paid
            if paid_amount > 0:
                pay = Payment(
                    id=f"pay-{uuid.uuid4().hex[:8]}",
                    tenant_id="tenant-1",
                    reservation_id=res.id,
                    reservation_ref=ref_code,
                    guest_name=f"{guest.first_name} {guest.last_name}",
                    amount=paid_amount,
                    currency="INR",
                    method=random.choice(["Card", "UPI", "Razorpay", "Bank Transfer"] if "Direct" in ch_choice or "Walk" in ch_choice else ["Virtual Card (VCC)", "OTA Collect"]),
                    status="Success",
                    date=check_in.isoformat(),
                    reference=f"PAY-{uuid.uuid4().hex[:6].upper()}",
                )
                db.add(pay)
                payments_count += 1

            # OTA Ingestion Log for OTA bookings
            if ota_res_id and (status == "Checked In" or status == "Confirmed" or random.random() < 0.15):
                log = OtaIngestionLog(
                    id=f"log-{uuid.uuid4().hex[:8]}",
                    tenant_id="tenant-1",
                    property_id="prop-1",
                    channel=ch_choice,
                    ota_reservation_id=ota_res_id,
                    guest_name=f"{guest.first_name} {guest.last_name}",
                    check_in_date=check_in.isoformat(),
                    check_out_date=check_out.isoformat(),
                    room_type_name=rt.name,
                    total_amount=total_room_charge,
                    commission_amount=comm_amount,
                    status="Ingested",
                    method=random.choice(["Email Ingestion", "Email Simulator", "CSV Import", "iCal Sync"]),
                    created_at=min(check_in - timedelta(days=random.randint(1, 14)), TODAY - timedelta(hours=random.randint(2, 6000))).isoformat(),
                )
                db.add(log)
                ota_logs_count += 1

            curr_date = next_date

    # Ensure 5 vacant rooms have Confirmed Arrivals Today (for front desk check-in workflow)
    vacant_candidates = [r for r in rooms_list if r.id not in [o[0].id for o in occupied_rooms_today]][:5]
    for rm in vacant_candidates if START_DATE <= TODAY < END_DATE else []:
        rt = room_types_map[rm.room_type_id]
        gst = random.choice(guests_pool)
        nights = min(2, (END_DATE - TODAY).days)
        rate = rt.base_price
        total_amt = rate * nights
        res_id = f"res-arr-{rm.room_number}"
        ref_code = f"SGN-ARR-{rm.room_number}"
        ch_choice = random.choice(["Direct Website", "Booking.com", "MakeMyTrip"])
        res = Reservation(
            id=res_id,
            tenant_id="tenant-1",
            property_id="prop-1",
            ref_code=ref_code,
            guest_id=gst.id,
            room_id=rm.id,
            room_number=rm.room_number,
            room_type_id=rt.id,
            room_type_name=rt.name,
            check_in_date=TODAY.isoformat(),
            check_out_date=(TODAY + timedelta(days=nights)).isoformat(),
            nights=nights,
            adults=2,
            children=0,
            status="Confirmed",
            booking_source=ch_choice,
            nightly_rate=rate,
            total_amount=total_amt,
            paid_amount=total_amt if ch_choice != "MakeMyTrip" else 0.0,
            balance_amount=0.0 if ch_choice != "MakeMyTrip" else total_amt,
            payment_status="Paid" if ch_choice != "MakeMyTrip" else "Unpaid",
            rate_plan_code="BAR-EP",
            special_requests="Arriving at 2 PM, early check-in requested",
            tags=[ch_choice, "Arrival Today"],
        )
        db.add(res)
        fol = Folio(
            id=f"fol-arr-{rm.room_number}",
            tenant_id="tenant-1",
            reservation_id=res.id,
            reservation_ref=ref_code,
            guest_name=f"{gst.first_name} {gst.last_name}",
            room_number=rm.room_number,
            total_charges=total_amt,
            total_payments=res.paid_amount,
            total_taxes=round(total_amt * 0.12, 2),
            balance=res.balance_amount,
            status="Open",
        )
        db.add(fol)
        db.add(FolioItem(
            id=f"item-arr-{rm.room_number}",
            tenant_id="tenant-1",
            folio_id=fol.id,
            date=TODAY.isoformat(),
            description=f"Accommodation Tariff — {nights} Nights ({rt.name}) [SAC 996311]",
            category="Room",
            amount=total_amt,
            type="Charge",
            reference=ref_code,
        ))
        reserved_rooms_today.append((rm, res_id, f"{gst.first_name} {gst.last_name}"))
        reservations_count += 1
        folios_count += 1

    # 9. Update Today's Physical Room Statuses
    print("[8/8] Finalizing today's real-time room occupancy and housekeeping tasks...")
    # Mark occupied rooms
    for rm, res_id, guest_name in occupied_rooms_today:
        rm.occupancy_status = "Occupied"
        rm.housekeeping_status = random.choice(["Clean", "Clean", "Inspected"])
        rm.current_reservation_id = res_id
        rm.current_guest_name = guest_name
        rm.key_card_assigned = True

    # Mark arriving today (reserved) rooms
    for rm, res_id, guest_name in reserved_rooms_today:
        if rm.occupancy_status == "Vacant":
            rm.occupancy_status = "Reserved"
            rm.housekeeping_status = "Ready"
            rm.current_reservation_id = res_id
            rm.current_guest_name = guest_name

    # Ensure all rooms are 100% Operational and Ready/Clean
    for rm in rooms_list:
        rm.maintenance_status = "Operational"
        rm.maintenance_notes = ""
        if rm.occupancy_status == "Vacant":
            rm.housekeeping_status = "Ready"

    # Generate Housekeeping Tasks for occupied stayovers
    for rm in rooms_list:
        if rm.occupancy_status == "Occupied":
            task = HousekeepingTask(
                id=f"hsk-{rm.room_number}",
                tenant_id="tenant-1",
                room_id=rm.id,
                room_number=rm.room_number,
                room_type=rm.room_type_name,
                floor=rm.floor,
                type="Stayover",
                priority="Normal",
                status="Clean",
                assigned_to=random.choice(["Sunita Rao", "Kavita Housekeeping", "Ramesh Housekeeping"]),
                notes="Daily service completed. Room clean and inspected.",
            )
            db.add(task)

    # Generate Maintenance Tickets (Historical resolved maintenance logs)
    tickets = [
        MaintenanceTicket(
            id="mnt-001",
            tenant_id="tenant-1",
            room_id="rm-205",
            room_number="205",
            title="Thermostat sensor calibrated & tested",
            description="Routine pre-arrival AC check completed. All HVAC parameters optimal.",
            priority="Low",
            severity="Low",
            status="Resolved",
            reported_by="Staff (Priya)",
            resolved_at="2026-09-18T10:00:00",
            category="HVAC/AC",
        ),
        MaintenanceTicket(
            id="mnt-002",
            tenant_id="tenant-1",
            room_id="rm-408",
            room_number="408",
            title="Balcony ocean-terrace glass sliding latch lubricated",
            description="Hardware lubrication and smooth latch action verified.",
            priority="Low",
            severity="Low",
            status="Resolved",
            reported_by="Staff (Sunita)",
            resolved_at="2026-09-18T11:15:00",
            category="Carpentry",
        ),
        MaintenanceTicket(
            id="mnt-003",
            tenant_id="tenant-1",
            room_id="rm-104",
            room_number="104",
            title="Rain showerhead descale and pressure valve test",
            description="Completed water pressure test and mineral descale. Fully resolved.",
            priority="Low",
            severity="Low",
            status="Resolved",
            reported_by="Night Auditor (Kiran)",
            resolved_at="2026-09-17T11:30:00",
            category="Plumbing",
        ),
    ]
    for tk in tickets:
        db.add(tk)

    # Generate Audit Logs
    audit_events = [
        ("OTA Ingestion Engine", "OTA_RESERVATIONS_SYNC", "Automated synchronization with Booking.com, MMT, Agoda & Airbnb feeds completed."),
        ("Priya Sharma", "CHECK_IN_COMPLETED", "Checked in guest Aarav Mehta to Room 101. Digital keycard issued."),
        ("Rohit Verma", "RATE_PLAN_UPDATE", "Adjusted festive season weekend multiplier to 1.15 for Executive Suites."),
        ("Sunita Rao", "HOUSEKEEPING_INSPECTED", "Inspected Room 302 (Deluxe Sea View). Status set to Ready."),
        ("Kiran Patel", "NIGHT_AUDIT_COMPLETED", "Night audit closed for business date 2026-09-18. 50 rooms balanced. Folio charges posted."),
    ]
    for staff, action, details in audit_events:
        db.add(AuditLog(
            id=f"aud-{uuid.uuid4().hex[:8]}",
            tenant_id="tenant-1",
            staff_name=staff,
            action=action,
            entity_id="prop-1",
            details=details,
        ))

    # 9. Seed Staff Members
    staff_members = [
        StaffMember(
            id="stf-1",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Vikramaditya Roy",
            email="roy@grandazuregoa.com",
            phone="+91 98201 55432",
            role="Owner",
            status="Active",
        ),
        StaffMember(
            id="stf-2",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Devendra Joshi",
            email="devendra.joshi@grandazuregoa.com",
            phone="+91 832 991 0021",
            role="Front Desk",
            status="Active",
        ),
        StaffMember(
            id="stf-3",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Sunita Patil",
            email="sunita.hsk@grandazuregoa.com",
            phone="+91 832 991 0033",
            role="Housekeeping",
            status="Active",
        ),
        StaffMember(
            id="stf-4",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Marcus Fernandes",
            email="marcus.rev@grandazuregoa.com",
            phone="+91 832 991 0044",
            role="Revenue Manager",
            status="Active",
        ),
        StaffMember(
            id="stf-5",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Rajesh Kumar",
            email="rajesh.mnt@grandazuregoa.com",
            phone="+91 832 991 0055",
            role="Maintenance",
            status="Active",
        ),
        StaffMember(
            id="stf-6",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Kiran Patel",
            email="kiran.na@grandazuregoa.com",
            phone="+91 832 991 0066",
            role="Night Auditor",
            status="Active",
        ),
        StaffMember(
            id="stf-7",
            tenant_id="tenant-1",
            property_id="prop-1",
            name="Arun Menon",
            email="arun.fin@grandazuregoa.com",
            phone="+91 832 991 0077",
            role="Finance",
            status="Active",
        ),
    ]
    for s in staff_members:
        db.add(s)

    # 10. Seed Initial Message Threads & Messages
    t1 = MessageThread(
        id="msg-1",
        tenant_id="tenant-1",
        property_id="prop-1",
        guest_name="Aarav Mehta",
        guest_phone="+91 98200 11223",
        room_number="102",
        reservation_ref="SGN-26-4412",
        channel="WhatsApp",
        unread_count=0,
        created_at="2026-09-19T08:30:00",
        last_message_at="2026-09-19T09:15:00",
    )
    db.add(t1)

    m1_1 = Message(
        id="m-101",
        thread_id="msg-1",
        sender="hotel",
        content="Welcome to Grand Azure Resort! Your room #102 is ready. High-speed Wi-Fi password is AzureGuest2026.",
        timestamp="2026-09-19T08:31:00",
        status="read",
    )
    m1_2 = Message(
        id="m-102",
        thread_id="msg-1",
        sender="guest",
        content="Thank you! Could we request extra pool towels to the room?",
        timestamp="2026-09-19T09:12:00",
        status="read",
    )
    m1_3 = Message(
        id="m-103",
        thread_id="msg-1",
        sender="hotel",
        content="Certainly Mr. Mehta, housekeeping has dispatched fresh pool towels to Room 102.",
        timestamp="2026-09-19T09:15:00",
        status="sent",
    )
    db.add_all([m1_1, m1_2, m1_3])

    t2 = MessageThread(
        id="msg-2",
        tenant_id="tenant-1",
        property_id="prop-1",
        guest_name="David Miller",
        guest_phone="+44 7700 900123",
        room_number="205",
        reservation_ref="SGN-26-8821",
        channel="WhatsApp",
        unread_count=1,
        created_at="2026-09-19T07:45:00",
        last_message_at="2026-09-19T08:50:00",
    )
    db.add(t2)

    m2_1 = Message(
        id="m-201",
        thread_id="msg-2",
        sender="hotel",
        content="Good morning Mr. Miller! Continental breakfast is being served at the Terrace Lounge until 10:30 AM.",
        timestamp="2026-09-19T07:46:00",
        status="read",
    )
    m2_2 = Message(
        id="m-202",
        thread_id="msg-2",
        sender="guest",
        content="Brilliant, thanks. Could you arrange an airport transfer for tomorrow at 2:00 PM?",
        timestamp="2026-09-19T08:50:00",
        status="sent",
    )
    db.add_all([m2_1, m2_2])

    db.commit()

    # Calculate statistics
    total_occupied = sum(1 for r in rooms_list if r.occupancy_status == "Occupied")
    total_reserved = sum(1 for r in rooms_list if r.occupancy_status == "Reserved")
    total_vacant = sum(1 for r in rooms_list if r.occupancy_status == "Vacant")

    print("=" * 70)
    print("SEEDING COMPLETE SUCCESSFULLY!")
    print(f"Total Physical Rooms:    {len(rooms_list)} (5 Floors: 101 to 510)")
    print(f"Today's Occupied Rooms:  {total_occupied} ({round(total_occupied/50*100, 1)}% current occupancy)")
    print(f"Today's Reserved Rooms:  {total_reserved} (Arriving today)")
    print(f"Today's Vacant Rooms:    {total_vacant}")
    print(f"Total Seed Bookings:     {reservations_count}")
    print(f"Total Folios Generated:  {folios_count}")
    print(f"Total Payments Logged:   {payments_count}")
    print(f"Total OTA Ingestion Logs:{ota_logs_count}")
    print(f"Total Guest Profiles:    {len(guests_pool)}")
    print("=" * 70)

    db.close()


if __name__ == "__main__":
    seed_50_rooms_yearly()
