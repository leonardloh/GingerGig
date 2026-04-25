// mock-data.jsx — realistic Malaysian mock data

// Provider portraits — randomuser.me with nationality filters.
// SEA/East Asian + Indian faces appropriate for Malaysia's three main communities.
// Each portrait is a deterministic seed so it loads the same person every time.
const PORTRAITS = {
  // Malay aunties/uncles (older women & men, warm tones) — using SEA-leaning seeds
  siti: "https://randomuser.me/api/portraits/women/79.jpg", // older Malay aunty
  fatimah: "https://randomuser.me/api/portraits/women/65.jpg", // older Malay aunty in tudung
  hassan: "https://randomuser.me/api/portraits/men/78.jpg", // older Malay uncle
  // Chinese elders
  chen: "https://randomuser.me/api/portraits/women/72.jpg", // Ah Ma
  mei: "https://randomuser.me/api/portraits/women/69.jpg", // Auntie Mei
  // Indian elder
  raju: "https://randomuser.me/api/portraits/men/83.jpg", // Uncle Raju
  // Younger requestors
  amir: "https://randomuser.me/api/portraits/men/32.jpg",
  nadia: "https://randomuser.me/api/portraits/women/44.jpg",
};

// Hero elder (the one demoing the voice flow + dashboard)
const HERO_ELDER = {
  id: "siti",
  name: "Makcik Siti",
  fullName: "Siti binti Hassan",
  age: 64,
  area: "Kepong, Kuala Lumpur",
  initials: "SH",
  tone: "warm",
  portrait: PORTRAITS.siti,
};

// Other providers shown in browse / search
const PROVIDERS = [
  {
    id: "siti",
    name: "Makcik Siti",
    age: 64,
    area: "Kepong",
    distance: "500m",
    initials: "SH",
    portrait: PORTRAITS.siti,
    service: "Masakan Melayu Tradisional",
    serviceEn: "Traditional Malay Home Cooking",
    category: "cat_cooking",
    rating: 4.9,
    reviews: 23,
    price: "RM15-20",
    priceUnit: "per meal",
    halal: true,
    tone: "warm",
    description:
      "Home-cooked rendang, nasi lemak, and kampung favourites — recipes I have been making for over 30 years. Cooked fresh every morning.",
    matchScore: 95,
    matchReason:
      "Specialises in Malay cuisine, halal certified, 500m from your area, available weekdays.",
    menu: [
      { name: "Rendang Daging", price: "RM18" },
      { name: "Nasi Lemak Bungkus", price: "RM8" },
      { name: "Ayam Masak Merah", price: "RM15" },
      { name: "Sambal Tumis Udang", price: "RM20" },
      { name: "Kuih Lapis (per box)", price: "RM12" },
    ],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  {
    id: "chen",
    name: "Ah Ma Chen",
    age: 68,
    area: "Kepong Baru",
    distance: "1.2km",
    initials: "CL",
    portrait: PORTRAITS.chen,
    service: "Hokkien Home-Style Cooking",
    serviceEn: "Hokkien Home-Style Cooking",
    category: "cat_cooking",
    rating: 4.8,
    reviews: 41,
    price: "RM12-25",
    priceUnit: "per meal",
    halal: false,
    tone: "teal",
    description:
      "Authentic Hokkien-style home cooking: bak kut teh, char kway teow, and herbal soups. 40 years in the kitchen.",
    matchScore: 88,
    matchReason:
      "Hokkien specialty, near your area, highly rated by 41 neighbours.",
    days: ["Tue", "Wed", "Thu", "Sat", "Sun"],
  },
  {
    id: "raju",
    name: "Uncle Raju",
    age: 71,
    area: "Sentul",
    distance: "2.4km",
    initials: "RM",
    portrait: PORTRAITS.raju,
    service: "South Indian Vegetarian",
    serviceEn: "South Indian Vegetarian",
    category: "cat_cooking",
    rating: 4.7,
    reviews: 18,
    price: "RM10-18",
    priceUnit: "per meal",
    halal: false,
    tone: "warm",
    description:
      "Pure vegetarian thali, dosa, and chettinad-style curries. Cooked with love on a banana leaf.",
    matchScore: 76,
    matchReason: "Vegetarian Indian, available daily, 2.4km from you.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    id: "fatimah",
    name: "Makcik Fatimah",
    age: 59,
    area: "Damansara Damai",
    distance: "800m",
    initials: "FA",
    portrait: PORTRAITS.fatimah,
    service: "Anyaman Mengkuang & Songket",
    serviceEn: "Mengkuang Weaving & Songket Crafts",
    category: "cat_crafts",
    rating: 5.0,
    reviews: 12,
    price: "RM30-200",
    priceUnit: "per piece",
    halal: true,
    tone: "warm",
    description:
      "Hand-woven mengkuang baskets and songket bookmarks. Each piece takes 2-3 days. Made the way my mother taught me.",
    days: ["Mon", "Wed", "Fri"],
  },
  {
    id: "hassan",
    name: "Pak Hassan",
    age: 67,
    area: "TTDI",
    distance: "1.8km",
    initials: "HM",
    portrait: PORTRAITS.hassan,
    service: "Pet Sitting & Dog Walking",
    serviceEn: "Pet Sitting & Dog Walking",
    category: "cat_pet",
    rating: 4.9,
    reviews: 27,
    price: "RM25",
    priceUnit: "per visit",
    halal: false,
    tone: "gold",
    description:
      "Retired veterinary assistant. I look after cats, dogs, and rabbits while you are away. Daily photo updates.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    id: "mei",
    name: "Aunty Mei",
    age: 62,
    area: "Bangsar",
    distance: "3.1km",
    initials: "ML",
    portrait: PORTRAITS.mei,
    service: "Light Housekeeping",
    serviceEn: "Light Housekeeping",
    category: "cat_household",
    rating: 4.6,
    reviews: 33,
    price: "RM18",
    priceUnit: "per hour",
    halal: false,
    tone: "sand",
    description:
      "Tidying, light cleaning, ironing. I bring my own supplies. Two hours minimum.",
    days: ["Mon", "Tue", "Thu", "Fri"],
  },
];

// Hero elder's listings (shown on dashboard)
const ELDER_LISTINGS = [
  {
    id: "l1",
    title: "Masakan Melayu Tradisional",
    titleEn: "Traditional Malay Cooking",
    category: "cat_cooking",
    price: "RM15-20",
    priceUnit: "per meal",
    rating: 4.9,
    bookings: 23,
    active: true,
  },
  {
    id: "l2",
    title: "Kuih-muih Tradisional",
    titleEn: "Traditional Kuih",
    category: "cat_cooking",
    price: "RM12",
    priceUnit: "per box",
    rating: 4.8,
    bookings: 8,
    active: true,
  },
];

// Hero elder's incoming bookings
const ELDER_BOOKINGS = [
  {
    id: "b1",
    requestor: "Amir",
    requestorInitials: "AR",
    portrait: PORTRAITS.amir,
    date: "Tomorrow, 6:30 PM",
    qty: "2 portions",
    item: "Rendang + Nasi Lemak",
    status: "pending",
    price: "RM36",
  },
  {
    id: "b2",
    requestor: "Nadia",
    requestorInitials: "NA",
    portrait: PORTRAITS.nadia,
    date: "Sat, 27 Apr · 12:00 PM",
    qty: "5 portions",
    item: "Ayam Masak Merah",
    status: "confirmed",
    price: "RM75",
  },
  {
    id: "b3",
    requestor: "Lim Family",
    requestorInitials: "LF",
    portrait: null,
    date: "Sun, 28 Apr · 11:00 AM",
    qty: "1 box",
    item: "Kuih Lapis",
    status: "confirmed",
    price: "RM12",
  },
];

// Hero elder's completed bookings (already delivered)
const ELDER_COMPLETED = [
  {
    id: "c1",
    requestor: "Faridah",
    requestorInitials: "FA",
    portrait:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
    date: "Today, 1:30 PM",
    qty: "3 portions",
    item: "Nasi Lemak Bungkus",
    status: "completed",
    price: "RM21",
    rating: 5,
  },
  {
    id: "c2",
    requestor: "Ahmad",
    requestorInitials: "AH",
    portrait:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    date: "Today, 12:00 PM",
    qty: "2 portions",
    item: "Rendang Daging",
    status: "completed",
    price: "RM30",
    rating: 5,
  },
  {
    id: "c3",
    requestor: "Mei Ling",
    requestorInitials: "ML",
    portrait:
      "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&h=200&fit=crop",
    date: "Yesterday, 6:00 PM",
    qty: "4 portions",
    item: "Ayam Masak Merah",
    status: "completed",
    price: "RM48",
    rating: 4,
  },
];

// Reviews for Makcik Siti's detail screen
const REVIEWS = [
  {
    id: "r1",
    author: "Amir R.",
    rating: 5,
    date: "2 weeks ago",
    text: "Tasted just like my own grandmother's rendang. Makcik Siti packed it warm and the sambal was perfect.",
  },
  {
    id: "r2",
    author: "Nadia A.",
    rating: 5,
    date: "1 month ago",
    text: "We ordered for a family gathering — 5 portions of ayam masak merah disappeared in 20 minutes.",
  },
  {
    id: "r3",
    author: "Lim H.",
    rating: 4,
    date: "1 month ago",
    text: "Generous portions, careful packaging. Will order again.",
  },
];

// Companion view — alerts about mum
const COMPANION_ALERTS = [
  {
    id: "a1",
    type: "success",
    text_en: "Mum earned her first RM100 this month — RM680 total!",
    text_ms: "Mak peroleh RM100 pertama bulan ini — keseluruhan RM680!",
    text_zh: "妈妈本月赚到第一个 RM100 — 总共 RM680!",
    text_ta: "அம்மா இந்த மாதம் முதல் RM100 சம்பாதித்தார் — மொத்தம் RM680!",
  },
  {
    id: "a2",
    type: "info",
    text_en:
      "Mum may be eligible for i-Saraan retirement matching. Tap to learn more.",
    text_ms: "Mak mungkin layak untuk i-Saraan. Ketuk untuk maklumat.",
    text_zh: "妈妈可能符合 i-Saraan 退休储蓄计划。点击了解更多。",
    text_ta:
      "அம்மா i-Saraan திட்டத்திற்கு தகுதி பெறலாம். மேலும் அறிய தட்டவும்.",
  },
  {
    id: "a3",
    type: "warning",
    text_en: "Mum has been active 6 days this week. She might need a rest day.",
    text_ms: "Mak aktif 6 hari minggu ini. Mungkin perlu rehat sehari.",
    text_zh: "妈妈这周已经工作 6 天,也许需要休息一天。",
    text_ta: "அம்மா இந்த வாரம் 6 நாட்கள் வேலை செய்தார். ஓய்வு தேவைப்படலாம்.",
  },
];

const TIMELINE = [
  {
    id: "t1",
    time: "Today, 4:20 PM",
    text_en: "Confirmed booking with Amir for tomorrow",
  },
  {
    id: "t2",
    time: "Today, 9:15 AM",
    text_en: "Posted new listing: Kuih Lapis",
  },
  {
    id: "t3",
    time: "Yesterday, 7:00 PM",
    text_en: "Completed delivery to Nadia (5 portions)",
  },
  {
    id: "t4",
    time: "Yesterday, 11:30 AM",
    text_en: "Earned RM75 from Sat booking",
  },
  {
    id: "t5",
    time: "Mon, 22 Apr",
    text_en: "Received 5-star review from Lim family",
  },
];


export { HERO_ELDER, PROVIDERS, ELDER_LISTINGS, ELDER_BOOKINGS, ELDER_COMPLETED, REVIEWS, COMPANION_ALERTS, TIMELINE, PORTRAITS };
