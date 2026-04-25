"""Hand-ported mock data from frontend/src/prototype/mock-data.js + DEMO_ACCOUNTS
from PrototypeApp.jsx (D-06).

All slugs here are stable identifiers consumed by `entity_id(kind, slug)` -
e.g. user "siti", listing "siti-listing-1", booking "siti-b1". Changing a slug
re-IDs the row on next seed (which is fine for re-runs but breaks any URL or
test that hardcoded the old UUID). Keep slugs stable.

All 4-locale text columns for COMPANION_ALERTS + TIMELINE are hand-written here
(D-09): the volume is small and the 4-language end-to-end story is a hackathon
judging signal.
"""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

PORTRAITS: dict[str, str] = {
    "siti": "https://randomuser.me/api/portraits/women/79.jpg",
    "fatimah": "https://randomuser.me/api/portraits/women/65.jpg",
    "hassan": "https://randomuser.me/api/portraits/men/78.jpg",
    "chen": "https://randomuser.me/api/portraits/women/72.jpg",
    "mei": "https://randomuser.me/api/portraits/women/69.jpg",
    "raju": "https://randomuser.me/api/portraits/men/83.jpg",
    "amir": "https://randomuser.me/api/portraits/men/32.jpg",
    "nadia": "https://randomuser.me/api/portraits/women/44.jpg",
}

# === Demo users (PrototypeApp.jsx::DEMO_ACCOUNTS - 3 quick-login chips) ===
# Phase 2 auth wires these credentials end-to-end against the backend.
DEMO_USERS: list[dict[str, Any]] = [
    {
        "slug": "siti",
        "email": "siti@gingergig.my",
        "password": "demo",  # bcrypt-hashed in seed.py with rounds=12
        "name": "Makcik Siti",
        "role": "elder",
        "locale": "ms",
        "kyc_status": "approved",
        "phone": "+60123456789",
        "area": "Kepong, Kuala Lumpur",
        "age": 64,
        "avatar_url": PORTRAITS["siti"],
    },
    {
        "slug": "amir",
        "email": "amir@gingergig.my",
        "password": "demo",
        "name": "Amir Razak",
        "role": "requestor",
        "locale": "en",
        "kyc_status": "not_started",
        "phone": "+60198765432",
        "area": "Damansara Utama",
        "age": 34,
        "avatar_url": PORTRAITS["amir"],
    },
    {
        "slug": "faiz",
        "email": "faiz@gingergig.my",
        "password": "demo",
        "name": "Faiz Hassan",
        "role": "companion",
        "locale": "en",
        "kyc_status": "not_started",
        "phone": "+60134567890",
        "area": "Bangsar, Kuala Lumpur",
        "age": 38,
        "avatar_url": "https://randomuser.me/api/portraits/men/45.jpg",
    },
]

# === Companion link (faiz watches siti) ===
COMPANION_LINKS: list[dict[str, Any]] = [
    {"companion_slug": "faiz", "elder_slug": "siti", "relationship": "son"},
]

# === Hero elder is Siti (already in DEMO_USERS) ===
HERO_ELDER: dict[str, Any] = {
    "slug": "siti",
    "name": "Makcik Siti",
    "full_name": "Siti binti Hassan",
    "age": 64,
    "area": "Kepong, Kuala Lumpur",
    "initials": "SH",
    "tone": "warm",
    "avatar_url": PORTRAITS["siti"],
}

# === Other elder providers (mock-data.js::PROVIDERS - non-Siti) ===
PROVIDERS: list[dict[str, Any]] = [
    {
        "slug": "chen",
        "email": "chen@gingergig.my",
        "name": "Ah Ma Chen",
        "age": 68,
        "area": "Kepong Baru",
        "distance": "1.2km",
        "initials": "CL",
        "avatar_url": PORTRAITS["chen"],
        "service": "Hokkien Home-Style Cooking",
        "service_en": "Hokkien Home-Style Cooking",
        "category": "cat_cooking",
        "rating": Decimal("4.8"),
        "reviews": 41,
        "price": "RM12-25",
        "price_unit": "per meal",
        "halal": False,
        "tone": "professional",
        "description": (
            "Authentic Hokkien-style home cooking: bak kut teh, char kway teow, "
            "and herbal soups. 40 years in the kitchen."
        ),
        "match_score": 88,
        "match_reason": "Hokkien specialty, near your area, highly rated by 41 neighbours.",
        "days": ["Tue", "Wed", "Thu", "Sat", "Sun"],
    },
    {
        "slug": "raju",
        "email": "raju@gingergig.my",
        "name": "Uncle Raju",
        "age": 71,
        "area": "Sentul",
        "distance": "2.4km",
        "initials": "RM",
        "avatar_url": PORTRAITS["raju"],
        "service": "South Indian Vegetarian",
        "service_en": "South Indian Vegetarian",
        "category": "cat_cooking",
        "rating": Decimal("4.7"),
        "reviews": 18,
        "price": "RM10-18",
        "price_unit": "per meal",
        "halal": False,
        "tone": "warm",
        "description": (
            "Pure vegetarian thali, dosa, and chettinad-style curries. "
            "Cooked with love on a banana leaf."
        ),
        "match_score": 76,
        "match_reason": "Vegetarian Indian, available daily, 2.4km from you.",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    {
        "slug": "fatimah",
        "email": "fatimah@gingergig.my",
        "name": "Makcik Fatimah",
        "age": 59,
        "area": "Damansara Damai",
        "distance": "800m",
        "initials": "FA",
        "avatar_url": PORTRAITS["fatimah"],
        "service": "Anyaman Mengkuang & Songket",
        "service_en": "Mengkuang Weaving & Songket Crafts",
        "category": "cat_crafts",
        "rating": Decimal("5.0"),
        "reviews": 12,
        "price": "RM30-200",
        "price_unit": "per piece",
        "halal": True,
        "tone": "warm",
        "description": (
            "Hand-woven mengkuang baskets and songket bookmarks. Each piece takes "
            "2-3 days. Made the way my mother taught me."
        ),
        "days": ["Mon", "Wed", "Fri"],
    },
    {
        "slug": "hassan",
        "email": "hassan@gingergig.my",
        "name": "Pak Hassan",
        "age": 67,
        "area": "TTDI",
        "distance": "1.8km",
        "initials": "HM",
        "avatar_url": PORTRAITS["hassan"],
        "service": "Pet Sitting & Dog Walking",
        "service_en": "Pet Sitting & Dog Walking",
        "category": "cat_pet",
        "rating": Decimal("4.9"),
        "reviews": 27,
        "price": "RM25",
        "price_unit": "per visit",
        "halal": False,
        "tone": "professional",
        "description": (
            "Retired veterinary assistant. I look after cats, dogs, and rabbits "
            "while you are away. Daily photo updates."
        ),
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    {
        "slug": "mei",
        "email": "mei@gingergig.my",
        "name": "Aunty Mei",
        "age": 62,
        "area": "Bangsar",
        "distance": "3.1km",
        "initials": "ML",
        "avatar_url": PORTRAITS["mei"],
        "service": "Light Housekeeping",
        "service_en": "Light Housekeeping",
        "category": "cat_household",
        "rating": Decimal("4.6"),
        "reviews": 33,
        "price": "RM18",
        "price_unit": "per hour",
        "halal": False,
        "tone": "professional",
        "description": (
            "Tidying, light cleaning, ironing. I bring my own supplies. "
            "Two hours minimum."
        ),
        "days": ["Mon", "Tue", "Thu", "Fri"],
    },
]

# === Listings (mock-data.js::ELDER_LISTINGS for Siti + provider cards) ===
LISTINGS: list[dict[str, Any]] = [
    {
        "slug": "siti-listing-1",
        "elder_slug": "siti",
        "category": "cat_cooking",
        "title_ms": "Masakan Melayu Tradisional",
        "title_en": "Traditional Malay Cooking",
        "title_zh": "Traditional Malay Cooking",
        "title_ta": "Traditional Malay Cooking",
        "description": (
            "Home-cooked rendang, nasi lemak, and kampung favourites - recipes I "
            "have been making for over 30 years. Cooked fresh every morning."
        ),
        "price": Decimal("15.00"),
        "price_max": Decimal("20.00"),
        "price_unit": "per_meal",
        "halal": True,
        "rating": Decimal("4.90"),
        "review_count": 23,
        "is_active": True,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "distance_label": "500m",
        "match_score": 95,
        "match_reason_ms": None,
        "match_reason_en": (
            "Specialises in Malay cuisine, halal certified, 500m from your area, "
            "available weekdays."
        ),
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
    {
        "slug": "siti-listing-2",
        "elder_slug": "siti",
        "category": "cat_cooking",
        "title_ms": "Kuih-muih Tradisional",
        "title_en": "Traditional Kuih",
        "title_zh": "Traditional Kuih",
        "title_ta": "Traditional Kuih",
        "description": "Traditional kuih lapis and assorted kampung sweets by the box.",
        "price": Decimal("12.00"),
        "price_max": None,
        "price_unit": "per_box",
        "halal": True,
        "rating": Decimal("4.80"),
        "review_count": 8,
        "is_active": True,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
    {
        "slug": "chen-listing-1",
        "elder_slug": "chen",
        "category": "cat_cooking",
        "title_ms": "Hokkien Home-Style Cooking",
        "title_en": "Hokkien Home-Style Cooking",
        "title_zh": "Hokkien Home-Style Cooking",
        "title_ta": "Hokkien Home-Style Cooking",
        "description": PROVIDERS[0]["description"],
        "price": Decimal("12.00"),
        "price_max": Decimal("25.00"),
        "price_unit": "per_meal",
        "halal": False,
        "rating": Decimal("4.80"),
        "review_count": 41,
        "is_active": True,
        "days": ["Tue", "Wed", "Thu", "Sat", "Sun"],
        "distance_label": PROVIDERS[0]["distance"],
        "match_score": PROVIDERS[0]["match_score"],
        "match_reason_ms": None,
        "match_reason_en": PROVIDERS[0]["match_reason"],
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
    {
        "slug": "raju-listing-1",
        "elder_slug": "raju",
        "category": "cat_cooking",
        "title_ms": "South Indian Vegetarian",
        "title_en": "South Indian Vegetarian",
        "title_zh": "South Indian Vegetarian",
        "title_ta": "South Indian Vegetarian",
        "description": PROVIDERS[1]["description"],
        "price": Decimal("10.00"),
        "price_max": Decimal("18.00"),
        "price_unit": "per_meal",
        "halal": False,
        "rating": Decimal("4.70"),
        "review_count": 18,
        "is_active": True,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "distance_label": PROVIDERS[1]["distance"],
        "match_score": PROVIDERS[1]["match_score"],
        "match_reason_ms": None,
        "match_reason_en": PROVIDERS[1]["match_reason"],
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
    {
        "slug": "fatimah-listing-1",
        "elder_slug": "fatimah",
        "category": "cat_crafts",
        "title_ms": "Anyaman Mengkuang & Songket",
        "title_en": "Mengkuang Weaving & Songket Crafts",
        "title_zh": "Mengkuang Weaving & Songket Crafts",
        "title_ta": "Mengkuang Weaving & Songket Crafts",
        "description": PROVIDERS[2]["description"],
        "price": Decimal("30.00"),
        "price_max": Decimal("200.00"),
        "price_unit": "per_piece",
        "halal": True,
        "rating": Decimal("5.00"),
        "review_count": 12,
        "is_active": True,
        "days": ["Mon", "Wed", "Fri"],
        "distance_label": PROVIDERS[2]["distance"],
        "match_score": 84,
        "match_reason_ms": None,
        "match_reason_en": "Craft specialist nearby with a perfect 5-star rating.",
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
    {
        "slug": "hassan-listing-1",
        "elder_slug": "hassan",
        "category": "cat_pet",
        "title_ms": "Pet Sitting & Dog Walking",
        "title_en": "Pet Sitting & Dog Walking",
        "title_zh": "Pet Sitting & Dog Walking",
        "title_ta": "Pet Sitting & Dog Walking",
        "description": PROVIDERS[3]["description"],
        "price": Decimal("25.00"),
        "price_max": None,
        "price_unit": "per_visit",
        "halal": False,
        "rating": Decimal("4.90"),
        "review_count": 27,
        "is_active": True,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "distance_label": PROVIDERS[3]["distance"],
        "match_score": 82,
        "match_reason_ms": None,
        "match_reason_en": "Experienced pet caregiver with daily availability.",
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
    {
        "slug": "mei-listing-1",
        "elder_slug": "mei",
        "category": "cat_household",
        "title_ms": "Light Housekeeping",
        "title_en": "Light Housekeeping",
        "title_zh": "Light Housekeeping",
        "title_ta": "Light Housekeeping",
        "description": PROVIDERS[4]["description"],
        "price": Decimal("18.00"),
        "price_max": None,
        "price_unit": "per_hour",
        "halal": False,
        "rating": Decimal("4.60"),
        "review_count": 33,
        "is_active": True,
        "days": ["Mon", "Tue", "Thu", "Fri"],
        "distance_label": PROVIDERS[4]["distance"],
        "match_score": 78,
        "match_reason_ms": None,
        "match_reason_en": "Reliable housekeeping support with strong neighbourhood reviews.",
        "match_reason_zh": None,
        "match_reason_ta": None,
    },
]

# === Listing menu items (mock-data.js::PROVIDERS[0].menu) ===
LISTING_MENU_ITEMS: list[dict[str, Any]] = [
    {
        "slug": "siti-listing-1-mi-1",
        "listing_slug": "siti-listing-1",
        "name": "Rendang Daging",
        "price": Decimal("18.00"),
        "sort_order": 0,
    },
    {
        "slug": "siti-listing-1-mi-2",
        "listing_slug": "siti-listing-1",
        "name": "Nasi Lemak Bungkus",
        "price": Decimal("8.00"),
        "sort_order": 1,
    },
    {
        "slug": "siti-listing-1-mi-3",
        "listing_slug": "siti-listing-1",
        "name": "Ayam Masak Merah",
        "price": Decimal("15.00"),
        "sort_order": 2,
    },
    {
        "slug": "siti-listing-1-mi-4",
        "listing_slug": "siti-listing-1",
        "name": "Sambal Tumis Udang",
        "price": Decimal("20.00"),
        "sort_order": 3,
    },
    {
        "slug": "siti-listing-2-mi-1",
        "listing_slug": "siti-listing-2",
        "name": "Kuih Lapis (per box)",
        "price": Decimal("12.00"),
        "sort_order": 0,
    },
]

# === Bookings (mock-data.js::ELDER_BOOKINGS + ELDER_COMPLETED, denormalised) ===
BOOKINGS: list[dict[str, Any]] = [
    {
        "slug": "siti-b1",
        "listing_slug": "siti-listing-1",
        "requestor_slug": "amir",
        "requestor_name": "Amir",
        "requestor_initials": "AR",
        "requestor_avatar_url": PORTRAITS["amir"],
        "listing_title": "Masakan Melayu Tradisional",
        "quantity_label": "2 portions",
        "item_description": "Rendang + Nasi Lemak",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 26, 10, 30, tzinfo=UTC),
        "amount": Decimal("36.00"),
        "currency": "MYR",
        "status": "pending",
        "completed_at": None,
    },
    {
        "slug": "siti-b2",
        "listing_slug": "siti-listing-1",
        "requestor_slug": "amir",
        "requestor_name": "Nadia",
        "requestor_initials": "NA",
        "requestor_avatar_url": PORTRAITS["nadia"],
        "listing_title": "Masakan Melayu Tradisional",
        "quantity_label": "5 portions",
        "item_description": "Ayam Masak Merah",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 27, 4, 0, tzinfo=UTC),
        "amount": Decimal("75.00"),
        "currency": "MYR",
        "status": "confirmed",
        "completed_at": None,
    },
    {
        "slug": "siti-b3",
        "listing_slug": "siti-listing-2",
        "requestor_slug": "amir",
        "requestor_name": "Lim Family",
        "requestor_initials": "LF",
        "requestor_avatar_url": None,
        "listing_title": "Kuih-muih Tradisional",
        "quantity_label": "1 box",
        "item_description": "Kuih Lapis",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 28, 3, 0, tzinfo=UTC),
        "amount": Decimal("12.00"),
        "currency": "MYR",
        "status": "confirmed",
        "completed_at": None,
    },
    {
        "slug": "siti-c1",
        "listing_slug": "siti-listing-1",
        "requestor_slug": "amir",
        "requestor_name": "Faridah",
        "requestor_initials": "FA",
        "requestor_avatar_url": (
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2"
            "?w=200&h=200&fit=crop"
        ),
        "listing_title": "Masakan Melayu Tradisional",
        "quantity_label": "3 portions",
        "item_description": "Nasi Lemak Bungkus",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 25, 5, 30, tzinfo=UTC),
        "amount": Decimal("21.00"),
        "currency": "MYR",
        "status": "completed",
        "completed_at": datetime(2026, 4, 25, 5, 30, tzinfo=UTC),
    },
    {
        "slug": "siti-c2",
        "listing_slug": "siti-listing-1",
        "requestor_slug": "amir",
        "requestor_name": "Ahmad",
        "requestor_initials": "AH",
        "requestor_avatar_url": (
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
            "?w=200&h=200&fit=crop"
        ),
        "listing_title": "Masakan Melayu Tradisional",
        "quantity_label": "2 portions",
        "item_description": "Rendang Daging",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 25, 4, 0, tzinfo=UTC),
        "amount": Decimal("30.00"),
        "currency": "MYR",
        "status": "completed",
        "completed_at": datetime(2026, 4, 25, 4, 0, tzinfo=UTC),
    },
    {
        "slug": "siti-c3",
        "listing_slug": "siti-listing-1",
        "requestor_slug": "amir",
        "requestor_name": "Mei Ling",
        "requestor_initials": "ML",
        "requestor_avatar_url": (
            "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604"
            "?w=200&h=200&fit=crop"
        ),
        "listing_title": "Masakan Melayu Tradisional",
        "quantity_label": "4 portions",
        "item_description": "Ayam Masak Merah",
        "notes": None,
        "scheduled_at": datetime(2026, 4, 24, 10, 0, tzinfo=UTC),
        "amount": Decimal("48.00"),
        "currency": "MYR",
        "status": "completed",
        "completed_at": datetime(2026, 4, 24, 10, 0, tzinfo=UTC),
    },
]

# === Reviews (mock-data.js::REVIEWS) ===
REVIEWS: list[dict[str, Any]] = [
    {
        "slug": "rev-1",
        "listing_slug": "siti-listing-1",
        "booking_slug": None,
        "author_slug": None,
        "author_name": "Amir R.",
        "rating": 5,
        "body": (
            "Tasted just like my own grandmother's rendang. Makcik Siti packed it "
            "warm and the sambal was perfect."
        ),
        "relative_date": "2 weeks ago",
    },
    {
        "slug": "rev-2",
        "listing_slug": "siti-listing-1",
        "booking_slug": None,
        "author_slug": None,
        "author_name": "Nadia A.",
        "rating": 5,
        "body": (
            "We ordered for a family gathering - 5 portions of ayam masak merah "
            "disappeared in 20 minutes."
        ),
        "relative_date": "1 month ago",
    },
    {
        "slug": "rev-3",
        "listing_slug": "siti-listing-1",
        "booking_slug": None,
        "author_slug": None,
        "author_name": "Lim H.",
        "rating": 4,
        "body": "Generous portions, careful packaging. Will order again.",
        "relative_date": "1 month ago",
    },
]

# === Companion alerts - 4 locale text per row (D-09) ===
COMPANION_ALERTS: list[dict[str, Any]] = [
    {
        "slug": "alert-1",
        "elder_slug": "siti",
        "kind": "celebration",
        "severity": "info",
        "title_ms": "Pencapaian pendapatan",
        "title_en": "Earnings milestone",
        "title_zh": "Earnings milestone",
        "title_ta": "Earnings milestone",
        "text_ms": "Mak peroleh RM100 pertama bulan ini - keseluruhan RM680!",
        "text_en": "Mum earned her first RM100 this month - RM680 total!",
        "text_zh": "妈妈本月赚到第一个 RM100 - 总共 RM680!",
        "text_ta": "அம்மா இந்த மாதம் முதல் RM100 சம்பாதித்தார் - மொத்தம் RM680!",
        "read_at": None,
    },
    {
        "slug": "alert-2",
        "elder_slug": "siti",
        "kind": "care",
        "severity": "info",
        "title_ms": "Cadangan i-Saraan",
        "title_en": "i-Saraan suggestion",
        "title_zh": "i-Saraan suggestion",
        "title_ta": "i-Saraan suggestion",
        "text_ms": "Mak mungkin layak untuk i-Saraan. Ketuk untuk maklumat.",
        "text_en": "Mum may be eligible for i-Saraan retirement matching. Tap to learn more.",
        "text_zh": "妈妈可能符合 i-Saraan 退休储蓄计划。点击了解更多。",
        "text_ta": "அம்மா i-Saraan திட்டத்திற்கு தகுதி பெறலாம். மேலும் அறிய தட்டவும்.",
        "read_at": None,
    },
    {
        "slug": "alert-3",
        "elder_slug": "siti",
        "kind": "care",
        "severity": "warning",
        "title_ms": "Cadangan rehat",
        "title_en": "Rest day suggestion",
        "title_zh": "Rest day suggestion",
        "title_ta": "Rest day suggestion",
        "text_ms": "Mak aktif 6 hari minggu ini. Mungkin perlu rehat sehari.",
        "text_en": "Mum has been active 6 days this week. She might need a rest day.",
        "text_zh": "妈妈这周已经工作 6 天,也许需要休息一天。",
        "text_ta": "அம்மா இந்த வாரம் 6 நாட்கள் வேலை செய்தார். ஓய்வு தேவைப்படலாம்.",
        "read_at": None,
    },
]

# === Companion alert preferences (one row per (companion, elder) pair) ===
COMPANION_ALERT_PREFERENCES: list[dict[str, Any]] = [
    {
        "companion_slug": "faiz",
        "elder_slug": "siti",
        "inactivity_24h": True,
        "overwork_signals": True,
        "earnings_milestones": True,
        "new_bookings": True,
        "reviews": True,
    },
]

# === Timeline events - 4 locale text per row (D-09) ===
TIMELINE: list[dict[str, Any]] = [
    {
        "slug": "tl-1",
        "elder_slug": "siti",
        "occurred_at": datetime(2026, 4, 25, 8, 20, tzinfo=UTC),
        "relative_label": "Today, 4:20 PM",
        "event_type": "booking_confirmed",
        "related_id": None,
        "text_ms": "Tempahan dengan Amir untuk esok telah disahkan",
        "text_en": "Confirmed booking with Amir for tomorrow",
        "text_zh": "Confirmed booking with Amir for tomorrow",
        "text_ta": "Confirmed booking with Amir for tomorrow",
    },
    {
        "slug": "tl-2",
        "elder_slug": "siti",
        "occurred_at": datetime(2026, 4, 25, 1, 15, tzinfo=UTC),
        "relative_label": "Today, 9:15 AM",
        "event_type": "listing_posted",
        "related_id": None,
        "text_ms": "Senarai baharu dipos: Kuih Lapis",
        "text_en": "Posted new listing: Kuih Lapis",
        "text_zh": "Posted new listing: Kuih Lapis",
        "text_ta": "Posted new listing: Kuih Lapis",
    },
    {
        "slug": "tl-3",
        "elder_slug": "siti",
        "occurred_at": datetime(2026, 4, 24, 11, 0, tzinfo=UTC),
        "relative_label": "Yesterday, 7:00 PM",
        "event_type": "booking_completed",
        "related_id": None,
        "text_ms": "Penghantaran kepada Nadia selesai (5 portions)",
        "text_en": "Completed delivery to Nadia (5 portions)",
        "text_zh": "Completed delivery to Nadia (5 portions)",
        "text_ta": "Completed delivery to Nadia (5 portions)",
    },
    {
        "slug": "tl-4",
        "elder_slug": "siti",
        "occurred_at": datetime(2026, 4, 24, 3, 30, tzinfo=UTC),
        "relative_label": "Yesterday, 11:30 AM",
        "event_type": "earnings_posted",
        "related_id": None,
        "text_ms": "Menerima RM75 daripada tempahan Sabtu",
        "text_en": "Earned RM75 from Sat booking",
        "text_zh": "Earned RM75 from Sat booking",
        "text_ta": "Earned RM75 from Sat booking",
    },
    {
        "slug": "tl-5",
        "elder_slug": "siti",
        "occurred_at": datetime(2026, 4, 22, 1, 0, tzinfo=UTC),
        "relative_label": "Mon, 22 Apr",
        "event_type": "review_received",
        "related_id": None,
        "text_ms": "Menerima ulasan 5 bintang daripada keluarga Lim",
        "text_en": "Received 5-star review from Lim family",
        "text_zh": "Received 5-star review from Lim family",
        "text_ta": "Received 5-star review from Lim family",
    },
]


def all_constants() -> dict[str, list[dict[str, Any]]]:
    """For tests: snapshot of every list - used by test_seed_idempotency.py."""
    return {
        "DEMO_USERS": DEMO_USERS,
        "COMPANION_LINKS": COMPANION_LINKS,
        "PROVIDERS": PROVIDERS,
        "LISTINGS": LISTINGS,
        "LISTING_MENU_ITEMS": LISTING_MENU_ITEMS,
        "BOOKINGS": BOOKINGS,
        "REVIEWS": REVIEWS,
        "COMPANION_ALERTS": COMPANION_ALERTS,
        "COMPANION_ALERT_PREFERENCES": COMPANION_ALERT_PREFERENCES,
        "TIMELINE": TIMELINE,
    }
